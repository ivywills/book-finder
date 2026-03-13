'use client';

import {
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react';
import { SignedIn, SignedOut, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Image, { type StaticImageData } from 'next/image';
import { generatePrompts } from '../actions/open-ai';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpRightFromSquare,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faDice,
  faHeart as solidHeart,
  faMagnifyingGlass,
  faStar as solidStar,
  faStarHalfAlt as halfStar,
} from '@fortawesome/free-solid-svg-icons';
import {
  faHeart as regularHeart,
  faStar as regularStar,
} from '@fortawesome/free-regular-svg-icons';
import defaultCover from './default-cover.jpg';
import booksArtwork from './books.png';

interface Book {
  name: string;
  author: string;
  isbn: string;
  image?: string | StaticImageData | null;
  averageRating?: number | null;
  ratingsCount?: number | null;
}

interface PromptShortcut {
  title: string;
  note: string;
  prompt: string;
  accent: string;
}

const ITEMS_PER_PAGE = 5;
const MAX_ATTEMPTS = 3;
const GOOGLE_BOOKS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY ?? '';

const QUICK_STARTS: PromptShortcut[] = [
  {
    title: 'Cozy but strange',
    note: 'tea, warmth, one weird little secret',
    prompt:
      'A cozy fantasy with a warm setting, lovable characters, and one quietly strange magical secret.',
    accent:
      'bg-[linear-gradient(135deg,rgba(254,243,199,0.95),rgba(255,255,255,0.92))]',
  },
  {
    title: 'Stormy mystery',
    note: 'old house, family drama, rain on every window',
    prompt:
      'A mystery set in an old house with family secrets, stormy weather, and a narrator who is probably hiding something.',
    accent:
      'bg-[linear-gradient(135deg,rgba(219,234,254,0.95),rgba(255,255,255,0.92))]',
  },
  {
    title: 'Messy romance',
    note: 'banter, yearning, two people making things worse',
    prompt:
      'A romance with sharp banter, real emotional messiness, and two people who make each other panic in entertaining ways.',
    accent:
      'bg-[linear-gradient(135deg,rgba(254,205,211,0.95),rgba(255,255,255,0.92))]',
  },
  {
    title: 'Big adventure',
    note: 'fast pace, great scenery, a fun crew',
    prompt:
      'A fast-moving adventure with vivid scenery, a fun group dynamic, and stakes that keep climbing.',
    accent:
      'bg-[linear-gradient(135deg,rgba(209,250,229,0.95),rgba(255,255,255,0.92))]',
  },
];

const getCoverSrc = (book: Book) => {
  if (typeof book.image === 'string') {
    return book.image;
  }

  return book.image?.src ?? defaultCover.src;
};

const getGoogleBooksUrl = (title: string) => {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return null;
  }

  const keySuffix = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : '';
  return `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(
    trimmedTitle
  )}${keySuffix}`;
};

const enrichBook = async (book: Book): Promise<Book> => {
  const baseBook: Book = {
    ...book,
    image: book.image ?? null,
    averageRating: book.averageRating ?? null,
    ratingsCount: book.ratingsCount ?? null,
  };

  try {
    const googleBooksUrl = getGoogleBooksUrl(book.name);

    if (googleBooksUrl) {
      const response = await fetch(googleBooksUrl);

      if (response.ok) {
        const data = await response.json();
        const volumeInfo = data.items?.[0]?.volumeInfo;

        if (volumeInfo?.imageLinks?.thumbnail) {
          return {
            ...baseBook,
            image: volumeInfo.imageLinks.thumbnail,
            averageRating: volumeInfo.averageRating ?? baseBook.averageRating,
            ratingsCount: volumeInfo.ratingsCount ?? baseBook.ratingsCount,
          };
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching Google Books data for ${book.name}`, error);
  }

  if (book.isbn) {
    try {
      const openLibraryUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(
        book.isbn
      )}&jscmd=data&format=json`;
      const response = await fetch(openLibraryUrl);

      if (response.ok) {
        const data = await response.json();
        const openLibraryBook = data[`ISBN:${book.isbn}`];

        if (openLibraryBook?.cover?.medium) {
          return {
            ...baseBook,
            image: openLibraryBook.cover.medium,
          };
        }
      }
    } catch (error) {
      console.error(`Error fetching Open Library data for ${book.isbn}`, error);
    }
  }

  return baseBook;
};

const enrichBooks = async (books: Book[]) => Promise.all(books.map(enrichBook));

const scrollShelf = (shelfId: string, direction: 'back' | 'forward') => {
  const shelf = document.getElementById(shelfId);

  if (!shelf) {
    return;
  }

  const amount = shelf.clientWidth * 0.9;
  shelf.scrollBy({
    left: direction === 'forward' ? amount : -amount,
    behavior: 'smooth',
  });
};

const HomePage = () => {
  const { user, isLoaded } = useUser();
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [favorites, setFavorites] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultsView, setResultsView] = useState<'shelf' | 'list'>('shelf');
  const [favoritesView, setFavoritesView] = useState<'shelf' | 'list'>('shelf');
  const [resultsPage, setResultsPage] = useState(1);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(true);
  const isSearchCardCollapsed = !isSearchPanelOpen;

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!isLoaded) {
        return;
      }

      if (!user) {
        setFavorites([]);
        setLoadingFavorites(false);
        return;
      }

      setLoadingFavorites(true);

      try {
        const response = await fetch(`/api/clerk?userId=${user.id}`);

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const currentEmail = user.primaryEmailAddress?.emailAddress;

        if (currentEmail && data.userProfile?.email !== currentEmail) {
          fetch('/api/clerk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'update.email',
              data: { userId: user.id, email: currentEmail },
            }),
          }).catch((syncError) => {
            console.error('Error syncing email:', syncError);
          });
        }

        if (data.userProfile?.favorites?.length) {
          const enrichedFavorites = await enrichBooks(data.userProfile.favorites);
          setFavorites(enrichedFavorites);
        } else {
          setFavorites([]);
        }
      } finally {
        setLoadingFavorites(false);
      }
    };

    fetchFavorites();
  }, [isLoaded, user]);

  const focusPrompt = () => {
    const textarea = document.getElementById('prompt') as HTMLTextAreaElement | null;
    textarea?.focus();
  };

  const loadPrompt = (value: string) => {
    setIsSearchPanelOpen(true);
    setPrompt(value);
    setError(null);
    requestAnimationFrame(() => focusPrompt());
  };

  const surpriseMe = () => {
    const options = QUICK_STARTS.map((item) => item.prompt);
    const nextPrompt = options[Math.floor(Math.random() * options.length)];
    loadPrompt(nextPrompt);
  };

  const isFavorite = (book: Book) =>
    favorites.some((favorite) => favorite.isbn === book.isbn);

  const renderStars = (averageRating: number | null | undefined) => {
    if (averageRating === null || averageRating === undefined) {
      return null;
    }

    return Array.from({ length: 5 }, (_, index) => {
      const star = index + 1;

      if (star <= averageRating) {
        return (
          <FontAwesomeIcon
            key={star}
            icon={solidStar}
            className="text-amber-400"
          />
        );
      }

      if (star - 0.5 <= averageRating) {
        return (
          <FontAwesomeIcon
            key={star}
            icon={halfStar}
            className="text-amber-400"
          />
        );
      }

      return (
        <FontAwesomeIcon
          key={star}
          icon={regularStar}
          className="text-base-300"
        />
      );
    });
  };

  const discoverBooks = async (searchPrompt: string, attempt = 0): Promise<Book[]> => {
    const generated = await generatePrompts(searchPrompt);

    if (generated?.books?.length) {
      return enrichBooks(generated.books);
    }

    if (attempt + 1 < MAX_ATTEMPTS) {
      return discoverBooks(searchPrompt, attempt + 1);
    }

    return [];
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setError('Try a feeling, a place, or a messy character situation.');
      focusPrompt();
      return;
    }

    setLoading(true);
    setError(null);
    setResultsPage(1);

    try {
      const nextResults = await discoverBooks(trimmedPrompt);
      setResults(nextResults);

      if (!nextResults.length) {
        setError(
          'Nothing clicked yet. Add one more detail and try again.'
        );
      } else {
        setIsSearchPanelOpen(false);
      }
    } catch (submitError) {
      console.error('Error generating prompt:', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not search for books.'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (book: Book) => {
    if (!user) {
      return;
    }

    const alreadyFavorite = isFavorite(book);

    try {
      const response = await fetch(`/api/clerk?userId=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: alreadyFavorite ? 'remove.favorite' : 'add.favorite',
          data: alreadyFavorite
            ? { userId: user.id, isbn: book.isbn }
            : { userId: user.id, book },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorites');
      }

      setFavorites((currentFavorites) => {
        if (alreadyFavorite) {
          return currentFavorites.filter(
            (favorite) => favorite.isbn !== book.isbn
          );
        }

        if (currentFavorites.some((favorite) => favorite.isbn === book.isbn)) {
          return currentFavorites;
        }

        return [book, ...currentFavorites];
      });
    } catch (favoriteError) {
      console.error('Error updating favorites:', favoriteError);
    }
  };

  const renderShelf = (books: Book[], shelfId: string) => {
    const tiltClasses = [
      'rotate-[-1deg]',
      'rotate-[1.2deg]',
      'rotate-[-0.7deg]',
      'rotate-[0.6deg]',
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-base-content/65">
            Swipe around or use the arrows.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-circle btn-sm border-base-300 bg-base-100/85"
              onClick={() => scrollShelf(shelfId, 'back')}
              aria-label="Scroll backward"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <button
              type="button"
              className="btn btn-circle btn-sm border-base-300 bg-base-100/85"
              onClick={() => scrollShelf(shelfId, 'forward')}
              aria-label="Scroll forward"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </div>

        <div
          id={shelfId}
          className="hide-scrollbar flex gap-5 overflow-x-auto pb-4 pt-2"
        >
          {books.map((book, index) => (
            <article
              key={`${shelfId}-${book.isbn}`}
              className={`group w-[16.5rem] flex-shrink-0 rounded-[1.9rem] border border-base-300/70 bg-base-100/90 p-3 shadow-xl transition duration-300 hover:-translate-y-1 hover:rotate-0 ${tiltClasses[index % tiltClasses.length]}`}
            >
              <div className="relative overflow-hidden rounded-[1.4rem] bg-base-200">
                <img
                  src={getCoverSrc(book)}
                  alt={`${book.name} cover`}
                  className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
                  onError={(event) => {
                    event.currentTarget.src = defaultCover.src;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                <SignedIn>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(book)}
                    className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-lg shadow-md transition hover:scale-105"
                    aria-label={
                      isFavorite(book) ? 'Remove from favorites' : 'Save to favorites'
                    }
                  >
                    <FontAwesomeIcon
                      icon={isFavorite(book) ? solidHeart : regularHeart}
                      className={
                        isFavorite(book) ? 'text-rose-500' : 'text-base-content/40'
                      }
                    />
                  </button>
                </SignedIn>

                {book.averageRating !== null &&
                book.averageRating !== undefined ? (
                  <div className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1 text-xs text-white">
                    <span className="flex items-center gap-1">
                      {renderStars(book.averageRating)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 px-2 pb-2 pt-4">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-primary/70">
                  Pick me maybe
                </p>
                <Link
                  href={`/prompts/${encodeURIComponent(book.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xl font-semibold leading-tight transition hover:text-primary"
                >
                  {book.name}
                </Link>
                <p className="text-sm text-base-content/65">
                  {book.author || 'Author unavailable'}
                </p>
                <div className="pt-3 text-sm text-base-content/55">
                  <span>Open details </span>
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  };

  const renderList = (
    books: Book[],
    currentPage: number,
    setCurrentPage: Dispatch<SetStateAction<number>>
  ) => {
    const totalPages = Math.max(1, Math.ceil(books.length / ITEMS_PER_PAGE));
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const visibleBooks = books.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-[1.4rem] border border-base-300/70 bg-base-100/75 px-4 py-3">
          <button
            type="button"
            className="btn btn-sm rounded-full border-base-300 bg-base-100/85"
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            disabled={currentPage === 1}
          >
            <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
            Prev
          </button>
          <p className="text-sm text-base-content/65">
            Page {currentPage} of {totalPages}
          </p>
          <button
            type="button"
            className="btn btn-sm rounded-full border-base-300 bg-base-100/85"
            onClick={() =>
              setCurrentPage((page) => Math.min(page + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            Next
            <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
          </button>
        </div>

        <div className="space-y-4">
          {visibleBooks.map((book, index) => (
            <article
              key={`${book.isbn}-${index}`}
              className="grid gap-4 rounded-[1.7rem] border border-base-300/70 bg-base-100/85 p-4 shadow-lg sm:grid-cols-[6.5rem_1fr_auto] sm:items-center"
            >
              <Link
                href={`/prompts/${encodeURIComponent(book.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={getCoverSrc(book)}
                  alt={`${book.name} cover`}
                  className="h-36 w-28 rounded-[1rem] object-cover shadow-md"
                  onError={(event) => {
                    event.currentTarget.src = defaultCover.src;
                  }}
                />
              </Link>

              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-primary/70">
                  On the pile
                </p>
                <Link
                  href={`/prompts/${encodeURIComponent(book.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-xl font-semibold leading-tight transition hover:text-primary"
                >
                  {book.name}
                </Link>
                <p className="mt-2 text-sm text-base-content/65">
                  {book.author || 'Author unavailable'}
                </p>
                {book.averageRating !== null && book.averageRating !== undefined ? (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      {renderStars(book.averageRating)}
                    </span>
                    {book.ratingsCount ? (
                      <span className="text-xs text-base-content/55">
                        {book.ratingsCount.toLocaleString()} ratings
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                <Link
                  href={`/prompts/${encodeURIComponent(book.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm rounded-full border-base-300 bg-base-100/85"
                >
                  Details
                </Link>
                <SignedIn>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(book)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-base-300 bg-base-100/90 text-lg shadow-sm transition hover:scale-105"
                    aria-label={
                      isFavorite(book) ? 'Remove from favorites' : 'Save to favorites'
                    }
                  >
                    <FontAwesomeIcon
                      icon={isFavorite(book) ? solidHeart : regularHeart}
                      className={
                        isFavorite(book) ? 'text-rose-500' : 'text-base-content/35'
                      }
                    />
                  </button>
                </SignedIn>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  };

  const renderLoadingCards = () => {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={`loading-${index}`}
            className="animate-pulse rounded-[1.8rem] border border-base-300/70 bg-base-100/70 p-4 shadow-lg"
          >
            <div className="h-72 rounded-[1.3rem] bg-base-200" />
            <div className="space-y-3 px-2 pb-2 pt-4">
              <div className="h-3 w-20 rounded-full bg-base-200" />
              <div className="h-6 w-3/4 rounded-full bg-base-200" />
              <div className="h-4 w-1/2 rounded-full bg-base-200" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEmptyDiscovery = () => {
    return (
      <div className="rounded-[2rem] border border-dashed border-base-300/70 bg-base-100/70 p-6 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
          No books yet
        </p>
        <h3 className="mt-3 text-3xl font-semibold text-balance">
          Start with a description.
        </h3>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_STARTS.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => loadPrompt(item.prompt)}
              className={`rounded-[1.5rem] border border-base-300/70 p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${item.accent}`}
            >
              <p className="text-sm font-semibold text-base-content">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-base-content/70">{item.note}</p>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderFavoritesEmpty = () => {
    if (loadingFavorites || !isLoaded) {
      return renderLoadingCards();
    }

    if (!user) {
      return (
        <SignedOut>
          <div className="rounded-[2rem] border border-dashed border-base-300/70 bg-base-100/70 p-8 text-center shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
              Save for later
            </p>
            <h3 className="mt-4 text-3xl font-semibold text-balance">
              Sign in if you want hearts to stick.
            </h3>
          </div>
        </SignedOut>
      );
    }

    return (
      <div className="rounded-[2rem] border border-dashed border-base-300/70 bg-base-100/70 p-8 text-center shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
          Empty for now
        </p>
        <h3 className="mt-4 text-3xl font-semibold text-balance">
          Tap the heart on anything you want to keep nearby.
        </h3>
      </div>
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden pb-16">
      <div className="pointer-events-none absolute inset-0 landing-dots opacity-60" />
      <div className="pointer-events-none absolute left-[-8rem] top-0 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute right-[-7rem] top-24 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-rose-200/30 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <section
          className={`relative overflow-hidden rounded-[2.6rem] border border-base-300/70 bg-base-100/82 shadow-2xl backdrop-blur transition-all duration-300 ${
            isSearchCardCollapsed
              ? 'px-5 pb-4 pt-5 sm:px-8 sm:pb-5 sm:pt-6'
              : 'px-5 pb-5 pt-8 sm:px-8 sm:pb-6 sm:pt-10'
          }`}
        >
          <div
            className={`pointer-events-none absolute right-[-1rem] hidden rotate-[10deg] opacity-85 transition-all duration-300 lg:block ${
              isSearchCardCollapsed ? 'top-2 w-28' : 'top-0 w-44'
            }`}
          >
            <Image
              src={booksArtwork}
              alt="Illustrated stack of books"
              priority
              className="float-slow h-auto w-full"
            />
          </div>

          <div className="relative mx-auto max-w-4xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col items-start text-left">
                <h1
                  className={`max-w-3xl text-balance font-semibold leading-tight transition-all duration-300 ${
                    isSearchCardCollapsed
                      ? 'text-2xl sm:text-3xl'
                      : 'text-3xl sm:text-4xl lg:text-5xl'
                  }`}
                >
                  Book Finder
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setIsSearchPanelOpen((open) => !open)}
                className="btn btn-sm rounded-full border-base-300 bg-base-100/90"
                aria-expanded={isSearchPanelOpen}
                aria-controls="search-panel"
              >
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`mr-2 transition-transform ${
                    isSearchPanelOpen ? 'rotate-180' : ''
                  }`}
                />
                {isSearchPanelOpen ? 'Close panel' : 'Open panel'}
              </button>
            </div>

            {isSearchCardCollapsed ? (
              <div className="mt-5 rounded-[1.6rem] border border-base-300/70 bg-base-100/90 px-4 py-3 shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/70">
                  Current search
                </p>
                <p className="mt-1 truncate text-sm text-base-content/70">
                  {prompt || 'Describe a book and search.'}
                </p>
              </div>
            ) : (
              <>
                <form
                  id="search-panel"
                  onSubmit={handleSubmit}
                  className="relative mt-8 rounded-[2.1rem] border border-base-300/70 bg-base-100/94 p-5 shadow-xl transition-all duration-300 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary/70">
                      Describe the book
                    </p>
                    <button
                      type="button"
                      onClick={surpriseMe}
                      className="btn rounded-full border-base-300 bg-base-100/90 px-5 text-sm"
                    >
                      <FontAwesomeIcon
                        icon={faDice}
                        className="mr-2 text-base"
                      />
                      Surprise me
                    </button>
                  </div>

                  <textarea
                    id="prompt"
                    className="mt-4 min-h-[10rem] w-full resize-none rounded-[1.8rem] border border-base-300 bg-base-100/95 px-6 py-5 text-lg leading-8 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    placeholder="A funny fantasy with danger, good banter, and a world that feels fun to hang out in..."
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={5}
                  />

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {QUICK_STARTS.map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => loadPrompt(item.prompt)}
                        className="rounded-full border border-base-300/70 bg-base-100/90 px-4 py-2 text-sm text-base-content/70 transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-base-content"
                      >
                        {item.title}
                      </button>
                    ))}
                    <button
                      type="submit"
                      className="btn btn-primary ml-auto rounded-full px-6 text-base"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="loading loading-spinner loading-sm" />
                          Looking...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon
                            icon={faMagnifyingGlass}
                            className="mr-2"
                          />
                          Find books
                        </>
                      )}
                    </button>
                  </div>

                  {error ? (
                    <p className="mt-3 text-sm text-error">{error}</p>
                  ) : null}
                </form>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {QUICK_STARTS.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => loadPrompt(item.prompt)}
                      className={`rounded-[1.5rem] border border-base-300/70 p-4 text-left shadow-lg transition hover:-translate-y-1 ${
                        index % 2 === 0 ? 'rotate-[-1deg]' : 'rotate-[1deg]'
                      } ${item.accent}`}
                    >
                      <p className="text-sm font-semibold text-base-content">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-base-content/70">
                        {item.note}
                      </p>
                    </button>
                  ))}
                </div>

                <SignedOut>
                  <p className="mt-3 text-center text-sm text-base-content/60">
                    Sign in to save favorites.
                  </p>
                </SignedOut>
              </>
            )}
          </div>
        </section>

        <section
          id="search-results"
          className="rounded-[2.2rem] border border-base-300/70 bg-base-100/78 p-6 shadow-2xl backdrop-blur sm:p-8"
        >
          <div className="flex flex-col gap-4 border-b border-base-300/50 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
                Search results
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl">
                {loading
                  ? 'Putting a stack together...'
                  : results.length > 0
                    ? 'Here are a few places to start'
                    : 'Results'}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-base-content/70">
                {results.length > 0
                  ? `You found ${results.length} book${
                      results.length === 1 ? '' : 's'
                    }.`
                  : 'Start with a description.'}
              </p>
            </div>

            {results.length > 0 ? (
              <div className="inline-flex rounded-full border border-base-300/70 bg-base-100/85 p-1">
                <button
                  type="button"
                  onClick={() => setResultsView('shelf')}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    resultsView === 'shelf'
                      ? 'bg-base-content text-base-100 shadow'
                      : 'text-base-content/65'
                  }`}
                >
                  Shelf
                </button>
                <button
                  type="button"
                  onClick={() => setResultsView('list')}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    resultsView === 'list'
                      ? 'bg-base-content text-base-100 shadow'
                      : 'text-base-content/65'
                  }`}
                >
                  List
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-8">
            {loading
              ? renderLoadingCards()
              : results.length > 0
                ? resultsView === 'shelf'
                  ? renderShelf(results, 'results-shelf')
                  : renderList(results, resultsPage, setResultsPage)
                : renderEmptyDiscovery()}
          </div>
        </section>

        <section className="rounded-[2.2rem] border border-base-300/70 bg-base-100/78 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 border-b border-base-300/50 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
                Your little shelf
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl">
                Saved books
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-base-content/70">
                Keep the good ones nearby.
              </p>
            </div>

            {favorites.length > 0 ? (
              <div className="inline-flex rounded-full border border-base-300/70 bg-base-100/85 p-1">
                <button
                  type="button"
                  onClick={() => setFavoritesView('shelf')}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    favoritesView === 'shelf'
                      ? 'bg-base-content text-base-100 shadow'
                      : 'text-base-content/65'
                  }`}
                >
                  Shelf
                </button>
                <button
                  type="button"
                  onClick={() => setFavoritesView('list')}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    favoritesView === 'list'
                      ? 'bg-base-content text-base-100 shadow'
                      : 'text-base-content/65'
                  }`}
                >
                  List
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-8">
            {favorites.length > 0
              ? favoritesView === 'shelf'
                ? renderShelf(favorites, 'favorites-shelf')
                : renderList(favorites, favoritesPage, setFavoritesPage)
              : renderFavoritesEmpty()}
          </div>
        </section>
      </div>
    </main>
  );
};

export default HomePage;
