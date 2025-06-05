'use client';

import { useEffect, useState } from 'react';
import { SignedIn, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { generatePrompts } from '../actions/open-ai';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart } from '@fortawesome/free-regular-svg-icons';
import { faStar as solidStar } from '@fortawesome/free-solid-svg-icons';
import { faStarHalfAlt as halfStar } from '@fortawesome/free-solid-svg-icons';
import { faStar as regularStar } from '@fortawesome/free-regular-svg-icons';
import defaultCover from './default-cover.jpg';
import { StaticImageData } from 'next/image';

interface Book {
  name: string;
  author: string;
  isbn: string;
  image: string | StaticImageData | null;
  averageRating: number | null;
  ratingsCount: number | null;
}

const HomePage = () => {
  const { user } = useUser();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<{ books: Book[] } | null>(null);
  const [favorites, setFavorites] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentSlideFavorites, setCurrentSlideFavorites] = useState(0);
  const [theme, setTheme] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'carousel' | 'list'>('carousel');
  const [favoritesView, setFavoritesView] = useState<'carousel' | 'list'>(
    'carousel'
  );
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const showArrows = true;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme) {
        setTheme(storedTheme);
      } else {
        setTheme('light');
      }
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;

      setLoadingFavorites(true);
      try {
        const userId = user.id;
        const response = await fetch(`/api/clerk?userId=${userId}`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (data.userProfile && data.userProfile.favorites) {
          const updatedFavorites = await fetchImages(
            data.userProfile.favorites
          );
          setFavorites(updatedFavorites);
        }
      } finally {
        setLoadingFavorites(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const fetchImages = async (books: Book[]) => {
    const booksWithImages = await Promise.all(
      books.map(async (book) => {
        const apiUrl = book?.name
          ? `https://www.googleapis.com/books/v1/volumes?q=intitle:${book.name}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
          : null;
        if (apiUrl) {
          try {
            const response = await fetch(apiUrl);
            if (response.ok) {
              const data = await response.json();
              const bookData = data.items?.[0]?.volumeInfo;
              if (!bookData?.imageLinks?.thumbnail) {
                return null;
              }
              if (bookData) {
                return {
                  ...book,
                  image: bookData.imageLinks?.thumbnail,
                  averageRating: bookData.averageRating || null,
                  ratingsCount: bookData.ratingsCount || null,
                };
              } else {
                console.error(`No data found for title: ${book.name}`);
              }
            } else {
              console.error(`Failed to fetch data for title: ${book.name}`);
            }
          } catch (error) {
            console.error(`Error fetching data for title: ${book.name}`, error);
          }
        }

        if (book?.isbn) {
          const openLibraryUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${book.isbn}&jscmd=data&format=json`;
          const response = await fetch(openLibraryUrl);
          if (response.ok) {
            const data = await response.json();
            const bookData = data[`ISBN:${book.isbn}`];
            if (!bookData.cover?.medium) {
              return null;
            }
            if (bookData) {
              return {
                ...book,
                image: bookData.cover?.medium,
                averageRating: null,
                ratingsCount: null,
              };
            }
          }
        }

        return null;
      })
    );

    return booksWithImages.filter((book) => book !== null);
  };

  if (!mounted) {
    return null;
  }

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    retryCount = 0
  ) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await generatePrompts(prompt);

      if (result && result.books.length > 0) {
        const booksWithImages = await Promise.all(
          result.books.map(async (book) => {
            try {
              const apiUrl = book.name
                ? `https://www.googleapis.com/books/v1/volumes?q=intitle:${book.name}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
                : null;

              if (apiUrl) {
                const response = await fetch(apiUrl);
                if (response.ok) {
                  const data = await response.json();
                  const bookData = data.items?.[0]?.volumeInfo;

                  if (bookData?.imageLinks?.thumbnail) {
                    return {
                      ...book,
                      image: bookData.imageLinks.thumbnail,
                      averageRating: bookData.averageRating || null,
                      ratingsCount: bookData.ratingsCount || null,
                    };
                  }
                }
              }

              if (book?.isbn) {
                const openLibraryUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${book.isbn}&jscmd=data&format=json`;
                const response = await fetch(openLibraryUrl);
                if (response.ok) {
                  const data = await response.json();
                  const bookData = data[`ISBN:${book.isbn}`];

                  if (bookData?.cover?.medium) {
                    return {
                      ...book,
                      image: bookData.cover.medium,
                      averageRating: null,
                      ratingsCount: null,
                    };
                  }
                }
              }
            } catch (error) {
              console.error(
                `Error fetching data for book: ${book.name || book.isbn}`,
                error
              );
            }

            return null;
          })
        );

        const filteredBooks = booksWithImages.filter((book) => book !== null);
        setResult({ books: filteredBooks });
      } else if (retryCount < 3) {
        await handleSubmit(e, retryCount + 1);
      } else {
        setError('No books found after multiple attempts.');
      }
    } catch (err) {
      setError('Failed to generate prompt');
      console.error('Error generating prompt:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToFavorites = async (book: Book) => {
    if (!user) return;

    try {
      const userId = user.id;
      const response = await fetch(`/api/clerk?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'add.favorite', data: { userId, book } }),
      });

      if (!response.ok) {
        throw new Error('Failed to add favorite');
      }

      setFavorites((prevFavorites) => {
        if (prevFavorites.some((fav) => fav.isbn === book.isbn)) {
          return prevFavorites.filter((fav) => fav.isbn !== book.isbn);
        } else {
          return [...prevFavorites, book];
        }
      });
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  };

  const isFavorite = (book: Book) => {
    return favorites.some((fav) => fav.isbn === book.isbn);
  };

  const renderStars = (averageRating: number | null) => {
    if (averageRating === null) return null;

    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= averageRating) {
        stars.push(
          <FontAwesomeIcon
            key={i}
            icon={solidStar}
            className="text-yellow-500"
            style={{ WebkitTextStroke: '1px white' }}
          />
        );
      } else if (i - 0.5 <= averageRating) {
        stars.push(
          <FontAwesomeIcon
            key={i}
            icon={halfStar}
            className="text-yellow-500"
            style={{ WebkitTextStroke: '1px white' }}
          />
        );
      } else {
        stars.push(
          <FontAwesomeIcon
            key={i}
            icon={regularStar}
            className="text-gray-300"
            style={{ WebkitTextStroke: '1px white' }}
          />
        );
      }
    }
    return stars;
  };

  const renderCarousel = (
    books: Book[],
    idPrefix: string,
    currentSlide: number,
    setCurrentSlide: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const slides = [];
    const itemsPerSlide = 3;
    for (let i = 0; i < books.length; i += itemsPerSlide) {
      slides.push(books.slice(i, i + itemsPerSlide));
    }

    const scrollToSlide = (carouselId: string, slideIndex: number) => {
      const carousel = document.getElementById(carouselId);
      if (carousel) {
        const slideWidth = carousel.clientWidth;
        carousel.scrollLeft = slideWidth * slideIndex;
      }
    };

    const handleScroll = (carouselId: string) => {
      const carousel = document.getElementById(carouselId);
      if (carousel) {
        const scrollLeft = carousel.scrollLeft;
        const slideWidth = carousel.clientWidth;
        const newSlideIndex = Math.round(scrollLeft / slideWidth);
        setCurrentSlide(newSlideIndex);
      }
    };

    return (
      <div className="relative">
        <div
          id={`${idPrefix}-carousel`}
          className="carousel w-full overflow-x-scroll snap-x snap-mandatory relative"
          onScroll={() => handleScroll(`${idPrefix}-carousel`)}
        >
          {slides.map((slide, index) => (
            <div
              id={`${idPrefix}${index}`}
              className="carousel-item relative w-full flex justify-center snap-center"
              key={index}
            >
              {slide.map((book) => (
                <div
                  key={book.isbn}
                  className="card w-1/3 p-2 relative hover:scale-105 transition-transform duration-300"
                >
                  <img
                    src={
                      typeof book.image === 'string'
                        ? book.image
                        : defaultCover.src
                    }
                    alt={`${book.name} cover`}
                    className="w-full h-48 object-cover rounded-lg shadow-md"
                    onError={(e) => {
                      e.currentTarget.src = defaultCover.src;
                    }}
                  />
                  <Link
                    href={`/prompts/${encodeURIComponent(book.name)}`}
                    passHref
                    legacyBehavior
                  >
                    <a target="_blank" rel="noopener noreferrer">
                      <div className="mt-2">
                        <strong className="block truncate">{book.name}</strong>
                        <p className="block truncate">{book.author}</p>
                      </div>
                    </a>
                  </Link>
                  <SignedIn>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToFavorites(book);
                      }}
                      className="absolute top-2 right-2 text-2xl px-2"
                      title="Add to Favorites"
                    >
                      <FontAwesomeIcon
                        icon={isFavorite(book) ? solidHeart : regularHeart}
                        className={
                          isFavorite(book) ? 'text-red-500' : 'text-white'
                        }
                      />
                    </button>
                  </SignedIn>
                </div>
              ))}
            </div>
          ))}
        </div>
        {showArrows && (
          <div className="hidden md:flex absolute left-5 right-5 top-1/2 transform -translate-y-1/2 justify-between z-10">
            <button
              onClick={() => {
                const prevSlideIndex =
                  (currentSlide - 1 + slides.length) % slides.length;
                setCurrentSlide(prevSlideIndex);
                scrollToSlide(`${idPrefix}-carousel`, prevSlideIndex);
              }}
              className="btn btn-circle border-primary border-2 text-primary"
            >
              ❮
            </button>
            <button
              onClick={() => {
                const nextSlideIndex = (currentSlide + 1) % slides.length;
                setCurrentSlide(nextSlideIndex);
                scrollToSlide(`${idPrefix}-carousel`, nextSlideIndex);
              }}
              className="btn btn-circle border-primary border-2 text-primary"
            >
              ❯
            </button>
          </div>
        )}
        <div className="flex justify-center mt-4 md:hidden">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`btn-secondary mx-1 w-2 h-2 rounded-full ${
                currentSlide === index ? 'bg-gray-800' : 'bg-gray-400'
              }`}
              onClick={() => {
                setCurrentSlide(index);
                scrollToSlide(`${idPrefix}-carousel`, index);
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderList = (books: Book[]) => {
    const totalPages = Math.ceil(books.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, books.length);
    const paginatedBooks = books.slice(startIndex, endIndex);

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <button
            className={`btn btn-xs btn-secondary`}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            ❮
          </button>
          <span className="text-sm font-medium text-gray-600 mx-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className={`btn btn-xs btn-secondary`}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            ❯
          </button>
        </div>

        <ul className="pl-5">
          {paginatedBooks.map((book) => (
            <li key={book.isbn} className="mb-4">
              <Link
                href={`/prompts/${encodeURIComponent(book.name)}`}
                passHref
                legacyBehavior
              >
                <a target="_blank" rel="noopener noreferrer">
                  <div className="flex items-center">
                    <img
                      src={
                        typeof book.image === 'string'
                          ? book.image
                          : defaultCover.src
                      }
                      alt={`${book.name} cover`}
                      className="w-16 h-24 object-cover mr-4 rounded-md shadow-sm"
                      onError={(e) => {
                        e.currentTarget.src = defaultCover.src;
                      }}
                    />
                    <div>
                      <strong className="block truncate text-lg text-gray-800">
                        {book.name}
                      </strong>
                      <p className="block truncate text-sm text-gray-600">
                        {book.author}
                      </p>
                      {book.averageRating !== null && (
                        <div className="flex items-center mt-1">
                          {renderStars(book.averageRating)}
                          <span className="ml-2 text-xs text-gray-500">
                            {book.ratingsCount ? `(${book.ratingsCount})` : ''}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          addToFavorites(book);
                        }}
                        className="text-2xl px-2 mt-2"
                        title="Add to Favorites"
                      >
                        <FontAwesomeIcon
                          icon={isFavorite(book) ? solidHeart : regularHeart}
                          className={
                            isFavorite(book) ? 'text-red-500' : 'text-gray-400'
                          }
                        />
                      </button>
                    </div>
                  </div>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto p-5">
      <h1 className="font-bold mb-6 text-center text-2xl">Book Finder</h1>
      <label
        htmlFor="prompt"
        className="block mb-4 text-lg text-primary text-center"
      >
        Describe the kind of book you want to read, and let AI discover it for
        you:
      </label>
      <form onSubmit={(e) => handleSubmit(e)} className="relative mb-6">
        {' '}
        <textarea
          id="prompt"
          className="textarea textarea-primary w-full h-20 resize-none rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none pr-12"
          placeholder="E.g., A fantasy novel with dragons and magic..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
        />
        <button
          type="submit"
          className="absolute bottom-1 right-2 text-primary pl-1 pr-1 py-1 m-1 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
          aria-label="Find Books"
        >
          {loading ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M22 2L11 13"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M22 2L15 22L11 13L2 9L22 2Z"
              />
            </svg>
          )}
        </button>
      </form>
      {result && (
        <div className="mt-5">
          <h2 className="mb-4">Suggested Reads:</h2>
          <div className="flex justify-end mb-4">
            <button
              className={`btn btn-sm ${
                view === 'list' ? 'btn-secondary' : 'btn-primary'
              }`}
              onClick={() => setView(view === 'carousel' ? 'list' : 'carousel')}
            >
              {view === 'carousel' ? 'List View' : 'Carousel View'}
            </button>
          </div>
          {view === 'carousel'
            ? renderCarousel(
                result.books,
                'result-slide',
                currentSlide,
                setCurrentSlide
              )
            : renderList(result.books)}
        </div>
      )}
      {loadingFavorites ? (
        <div className="flex justify-center items-center min-h-screen -mt-40"></div>
      ) : (
        favorites.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-4">Favorites:</h2>
            <div className="flex justify-end mb-4">
              <button
                className={`btn btn-sm ${
                  favoritesView === 'list' ? 'btn-secondary' : 'btn-primary'
                }`}
                onClick={() =>
                  setFavoritesView(
                    favoritesView === 'carousel' ? 'list' : 'carousel'
                  )
                }
              >
                {favoritesView === 'carousel' ? 'List View' : 'Carousel View'}
              </button>
            </div>
            {favoritesView === 'carousel'
              ? renderCarousel(
                  favorites,
                  'favorite-slide',
                  currentSlideFavorites,
                  setCurrentSlideFavorites
                )
              : renderList(favorites)}
          </div>
        )
      )}
      {error && (
        <div className="text-red-500 mt-5">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
