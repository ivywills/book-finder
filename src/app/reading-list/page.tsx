'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useClerk } from '@clerk/clerk-react';
import Image from 'next/image';
import defaultCover from '../default-cover.jpg';
import defaultProfilePic from '../friends/profile-pic.png';
import { PencilIcon } from '@heroicons/react/outline';
import { TrashIcon } from '@heroicons/react/outline';
import { CheckCircleIcon } from '@heroicons/react/outline';

interface Book {
  title: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  imageLinks?: {
    thumbnail?: string;
  };
}

const isSameBook = (left: Book, right: Book) =>
  left.title === right.title &&
  (left.authors?.join('|') ?? '') === (right.authors?.join('|') ?? '');

const ReadingPage = () => {
  const { user } = useUser();
  const clerk = useClerk();
  const [title, setTitle] = useState('');
  const [book, setBook] = useState<Book | null>(null);
  const [confirmedBook, setConfirmedBook] = useState<Book | null>(null);
  const [completedBooks, setCompletedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagesRead, setPagesRead] = useState<number>(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const progressSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    const fetchBooks = async () => {
      if (!user) return;

      setLoading(true);

      try {
        const response = await fetch(`/api/clerk?userId=${user.id}`);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (data.userProfile.currentlyReading) {
          setConfirmedBook(data.userProfile.currentlyReading.book);
          setPagesRead(data.userProfile.currentlyReading.progress || 0);
        }
        if (data.userProfile.completedBooks) {
          setCompletedBooks(data.userProfile.completedBooks);
        }
        if (data.userProfile.imageUrl) {
          setProfileImage(data.userProfile.imageUrl);
        }
      } catch (err) {
        console.error('Error fetching books:', err);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    fetchBooks();
  }, [user]);

  useEffect(() => {
    return () => {
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setBook(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=intitle:${title}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch book details from Google Books');
      }
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const bookData = data.items[0].volumeInfo;
        const book: Book = {
          title: bookData.title,
          authors: bookData.authors || ['Unknown Author'],
          publisher: bookData.publisher || 'Unknown Publisher',
          publishedDate: bookData.publishedDate || 'Unknown Date',
          description: bookData.description || null,
          pageCount: bookData.pageCount || null,
          imageLinks: {
            thumbnail: bookData.imageLinks?.thumbnail || null,
          },
        };
        setBook(book);
      } else {
        throw new Error('Book not found in Google Books');
      }
    } catch (err) {
      console.error('Error fetching book details from Google Books:', err);

      const openLibraryUrl = `https://openlibrary.org/search.json?title=${title}`;
      try {
        const response = await fetch(openLibraryUrl);
        if (response.ok) {
          const data = await response.json();
          const bookData = data.docs?.find(
            (doc: { title: string }) =>
              doc.title.toLowerCase() === title.toLowerCase()
          );

          if (!bookData || !bookData.cover_i) {
            throw new Error('Book not found or missing cover in Open Library');
          }

          const book: Book = {
            title: bookData.title,
            authors: bookData.author_name || ['Unknown Author'],
            publisher: bookData.publisher?.[0] || 'Unknown Publisher',
            publishedDate: bookData.publish_date?.[0] || 'Unknown Date',
            description: bookData.first_sentence?.value || null,
            pageCount: 0,
            imageLinks: {
              thumbnail: `https://covers.openlibrary.org/b/id/${bookData.cover_i}-L.jpg`,
            },
          };

          setBook(book);
        } else {
          throw new Error('Failed to fetch book details from Open Library');
        }
      } catch (err) {
        console.error('Error fetching book details from Open Library:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCurrentlyReading = async () => {
    if (!user || !book) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'add.currentlyReading',
          data: {
            userId: user.id,
            book,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update currently reading book');
      }

      setConfirmedBook(book);
      setPagesRead(0);
      setBook(null);
      setTitle('');
    } catch (err) {
      console.error('Error updating currently reading book:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCompleted = async (completedBook: Book) => {
    if (!user || !completedBook) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'add.completedBook',
          data: {
            userId: user.id,
            book: completedBook,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add completed book');
      }

      setCompletedBooks((currentBooks) =>
        currentBooks.some((currentBook) =>
          isSameBook(currentBook, completedBook)
        )
          ? currentBooks
          : [completedBook, ...currentBooks]
      );
      setBook(null);
      setTitle('');
    } catch (err) {
      console.error('Error adding completed book:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePagesReadChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newPagesRead = Number(e.target.value);
    setPagesRead(newPagesRead);

    if (user && confirmedBook) {
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }

      progressSaveTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch('/api/clerk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'update.readingProgress',
              data: {
                userId: user.id,
                book: confirmedBook.title,
                progress: newPagesRead,
              },
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update reading progress');
          }
        } catch (err) {
          console.error('Error updating reading progress:', err);
        }
      }, 500);
    }
  };

  const handleRemove = async () => {
    if (!user || !confirmedBook) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'remove.currentlyReading',
          data: {
            userId: user.id,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove currently reading book');
      }

      setConfirmedBook(null);
      setPagesRead(0);
    } catch (err) {
      console.error('Error removing currently reading book:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!user || !e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        await clerk.user?.setProfileImage({ file });
        setProfileImage(base64Image);
        const response = await fetch('/api/clerk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'update.profileImage',
            data: {
              userId: user.id,
              imageUrl: base64Image,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update profile image in database');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error updating profile image:', err);
    } finally {
      setLoading(false);
    }
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
      <div className="relative space-y-4">
        <div
          id={`${idPrefix}-carousel`}
          className="carousel relative w-full overflow-x-scroll snap-x snap-mandatory rounded-[2rem] border border-base-300/70 bg-base-100/72 px-2 py-4 shadow-xl backdrop-blur"
          onScroll={() => handleScroll(`${idPrefix}-carousel`)}
        >
          {slides.map((slide, index) => (
            <div
              id={`${idPrefix}${index}`}
              className="carousel-item relative flex w-full justify-center snap-center"
              key={index}
            >
              {slide.map((book) => (
                <div
                  key={book.title}
                  className="w-1/3 p-2"
                >
                  <div className="relative rounded-[1.7rem] border border-base-300/70 bg-base-100/92 p-3 shadow-lg transition duration-300 hover:-translate-y-1">
                    <Image
                      src={book.imageLinks?.thumbnail || defaultCover.src}
                      alt={`${book.title} cover`}
                      width={150}
                      height={225}
                      className="h-auto w-full rounded-[1.2rem] object-cover shadow-md"
                      onError={(e) => {
                        e.currentTarget.src = defaultCover.src;
                      }}
                    />
                    <div className="mt-4 px-1">
                      <strong className="block truncate text-center text-sm font-semibold">
                        {book.title}
                      </strong>
                      <p className="mt-1 block truncate text-center text-sm text-base-content/65">
                        {book.authors
                          ? book.authors.join(', ')
                          : 'Unknown Author'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="absolute left-5 right-5 top-1/2 hidden -translate-y-1/2 justify-between md:flex">
          <button
            type="button"
            onClick={() => {
              const prevSlideIndex =
                (currentSlide - 1 + slides.length) % slides.length;
              setCurrentSlide(prevSlideIndex);
              scrollToSlide(`${idPrefix}-carousel`, prevSlideIndex);
            }}
            className="btn btn-circle btn-sm border-base-300 bg-base-100/90 shadow-md"
          >
            ❮
          </button>
          <button
            type="button"
            onClick={() => {
              const nextSlideIndex = (currentSlide + 1) % slides.length;
              setCurrentSlide(nextSlideIndex);
              scrollToSlide(`${idPrefix}-carousel`, nextSlideIndex);
            }}
            className="btn btn-circle btn-sm border-base-300 bg-base-100/90 shadow-md"
          >
            ❯
          </button>
        </div>
        <div className="mt-4 flex justify-center md:hidden">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`mx-1 h-2.5 w-2.5 rounded-full transition ${
                currentSlide === index ? 'bg-base-content' : 'bg-base-300'
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

  const sectionCardClassName =
    'rounded-[2.2rem] border border-base-300/70 bg-base-100/78 p-6 shadow-2xl backdrop-blur sm:p-8';
  const sectionEyebrowClassName =
    'text-xs font-semibold uppercase tracking-[0.35em] text-primary/70';
  const insetCardClassName =
    'rounded-[1.9rem] bg-base-100/88 p-5 shadow-xl sm:p-6';

  if (initialLoad) {
    return (
      <main className="relative min-h-screen overflow-hidden pb-16">
        <div className="pointer-events-none absolute inset-0 landing-dots opacity-60" />
        <div className="pointer-events-none absolute left-[-8rem] top-0 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="pointer-events-none absolute right-[-7rem] top-24 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="relative mx-auto flex min-h-[70vh] w-full max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className={`${sectionCardClassName} w-full max-w-md text-center`}>
            <span className="loading loading-spinner loading-md" />
            <p className="mt-4 text-sm text-base-content/60">
              Loading your shelf...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden pb-16">
      <div className="pointer-events-none absolute inset-0 landing-dots opacity-60" />
      <div className="pointer-events-none absolute left-[-8rem] top-0 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute right-[-7rem] top-24 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-rose-200/30 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <section className={`${sectionCardClassName} relative overflow-hidden`}>
          <div className="pointer-events-none absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-2rem] left-[-1rem] h-28 w-28 rounded-full bg-secondary/15 blur-3xl" />

          <p className={sectionEyebrowClassName}>Profile</p>
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative w-fit">
              <Image
                src={profileImage || defaultProfilePic.src}
                alt="Profile"
                width={112}
                height={112}
                className="aspect-square rounded-full border border-base-300/70 object-cover shadow-xl"
              />
              <button
                type="button"
                className="absolute bottom-0 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-base-300/70 bg-base-100/92 shadow-md transition hover:scale-105"
                onClick={() => setEditMode(!editMode)}
                aria-label="Edit profile image"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-balance sm:text-4xl">
                Book Shelf
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-base-content/70">
                Start tracking the books you&apos;ve loved and the one you&apos;re
                reading right now.
              </p>
              <div className="inline-flex rounded-full border border-base-300/70 bg-base-100/90 px-4 py-2 text-sm text-base-content/70 shadow-sm">
                Books read
                <span className="ml-2 font-semibold text-base-content">
                  {completedBooks.length}
                </span>
              </div>
              <h2 className="text-xl font-semibold">
                {user
                  ? user.fullName || user.primaryEmailAddress?.toString()
                  : 'Guest'}
              </h2>
            </div>
          </div>
          {editMode && (
            <div className="mt-6 rounded-[1.7rem] border border-base-300/70 bg-base-100/88 p-5 shadow-lg">
              <label
                htmlFor="profileImage"
                className="block text-sm font-medium text-base-content/70"
              >
                Upload profile image
              </label>
              <input
                type="file"
                id="profileImage"
                className="file-input file-input-bordered mt-3 w-full rounded-full border-base-300 bg-base-100/90"
                accept="image/*"
                onChange={handleProfileImageChange}
              />
            </div>
          )}
        </section>

        <section className={sectionCardClassName}>
          <div className="border-b border-base-300/50 pb-6">
            <p className={sectionEyebrowClassName}>Find a book</p>
            <h2 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl">
              Add a book to your profile
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-base-content/70">
              Add a book you&apos;re currently reading to track your progress, or
              showcase one you&apos;ve already finished.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                id="title"
                className="input input-bordered h-14 flex-grow rounded-full border-base-300 bg-base-100/90 px-5 text-base shadow-sm"
                placeholder="Enter book title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary h-14 rounded-full px-6">
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {book && (
            <div className={`mt-8 ${insetCardClassName}`}>
              <div className="grid gap-6 sm:grid-cols-[8rem_1fr]">
                {book.imageLinks?.thumbnail ? (
                  <Image
                    src={book.imageLinks.thumbnail}
                    alt={`${book.title} cover`}
                    width={128}
                    height={192}
                    className="h-auto w-32 rounded-[1.3rem] object-cover shadow-md"
                  />
                ) : null}
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-balance">
                    {book.title}
                  </h3>
                  <p className="text-sm text-base-content/70">
                    <strong className="font-semibold text-base-content">
                      Author:
                    </strong>{' '}
                    {book.authors ? book.authors.join(', ') : 'Unknown Author'}
                  </p>
                  <p className="text-sm text-base-content/70">
                    <strong className="font-semibold text-base-content">
                      Publisher:
                    </strong>{' '}
                    {book.publisher || 'Unknown Publisher'}
                  </p>
                  <p className="text-sm text-base-content/70">
                    <strong className="font-semibold text-base-content">
                      Published:
                    </strong>{' '}
                    {book.publishedDate || 'Unknown Date'}
                  </p>
                  <p className="text-sm text-base-content/70">
                    <strong className="font-semibold text-base-content">
                      Pages:
                    </strong>{' '}
                    {book.pageCount || 'Unknown'}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      className="btn btn-success rounded-full px-5"
                      onClick={handleConfirmCurrentlyReading}
                      disabled={loading}
                    >
                      Currently Reading
                    </button>
                    <button
                      type="button"
                      className="btn btn-success rounded-full px-5"
                      onClick={() => {
                        if (book) {
                          handleConfirmCompleted(book);
                        }
                      }}
                      disabled={loading}
                    >
                      Completed Books
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className={sectionCardClassName}>
          <div className="border-b border-base-300/50 pb-6">
            <p className={sectionEyebrowClassName}>In progress</p>
            <h2 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl">
              Currently Reading
            </h2>
          </div>

          <div className="mt-8">
            {confirmedBook ? (
              <div className={insetCardClassName}>
                <div className="grid gap-6 lg:grid-cols-[8rem_1fr]">
                  {confirmedBook.imageLinks?.thumbnail ? (
                    <Image
                      src={confirmedBook.imageLinks.thumbnail}
                      alt={`${confirmedBook.title} cover`}
                      width={128}
                      height={192}
                      className="h-auto w-32 rounded-[1.3rem] object-cover shadow-md"
                    />
                  ) : null}
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-balance">
                      {confirmedBook.title}
                    </h3>
                    <p className="text-sm text-base-content/70">
                      <strong className="font-semibold text-base-content">
                        Author:
                      </strong>{' '}
                      {confirmedBook.authors
                        ? confirmedBook.authors.join(', ')
                        : 'Unknown Author'}
                    </p>
                    <p className="text-sm text-base-content/70">
                      <strong className="font-semibold text-base-content">
                        Publisher:
                      </strong>{' '}
                      {confirmedBook.publisher || 'Unknown Publisher'}
                    </p>
                    <p className="text-sm text-base-content/70">
                      <strong className="font-semibold text-base-content">
                        Published:
                      </strong>{' '}
                      {confirmedBook.publishedDate || 'Unknown Date'}
                    </p>
                    {!!confirmedBook.pageCount && (
                      <div className="rounded-[1.5rem] bg-base-200/60 p-4">
                        <p className="text-sm text-base-content/75">
                          <strong className="font-semibold text-base-content">
                            Pages:
                          </strong>{' '}
                          {confirmedBook.pageCount || 'Unknown'}
                        </p>
                        <div className="mt-4">
                          <label
                            htmlFor="pagesRead"
                            className="block text-sm font-medium text-base-content/70"
                          >
                            Pages Read: {pagesRead} / {confirmedBook.pageCount}
                          </label>
                          <input
                            type="range"
                            id="pagesRead"
                            min="0"
                            max={confirmedBook.pageCount}
                            value={pagesRead}
                            onChange={handlePagesReadChange}
                            className="range range-secondary mt-3 w-full"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="button"
                        className="btn rounded-full px-5"
                        aria-label="complete"
                        onClick={async () => {
                          if (confirmedBook) {
                            await handleConfirmCompleted(confirmedBook);
                            await handleRemove();
                          }
                        }}
                        disabled={loading}
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        Complete
                      </button>
                      <button
                        type="button"
                        className="btn rounded-full px-5"
                        aria-label="remove"
                        onClick={handleRemove}
                        disabled={loading}
                      >
                        <TrashIcon className="h-5 w-5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-base-300/70 bg-base-100/70 p-8 text-center shadow-lg">
                <p className={sectionEyebrowClassName}>Nothing here yet</p>
                <h3 className="mt-4 text-3xl font-semibold text-balance">
                  No book is currently being read.
                </h3>
                <p className="mt-3 text-sm leading-6 text-base-content/70">
                  Use the search above to add the book you&apos;re currently
                  reading.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className={sectionCardClassName}>
          <div className="border-b border-base-300/50 pb-6">
            <p className={sectionEyebrowClassName}>Finished</p>
            <h2 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl">
              Completed Books
            </h2>
          </div>

          <div className="mt-8">
            {completedBooks.length > 0 ? (
              renderCarousel(
                completedBooks,
                'completed-slide',
                currentSlide,
                setCurrentSlide
              )
            ) : (
              <div className="rounded-[2rem] border border-dashed border-base-300/70 bg-base-100/70 p-8 text-center shadow-lg">
                <p className={sectionEyebrowClassName}>Shelf is empty</p>
                <h3 className="mt-4 text-3xl font-semibold text-balance">
                  No completed books yet.
                </h3>
                <p className="mt-3 text-sm leading-6 text-base-content/70">
                  Use the search above to add the books you&apos;ve finished.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default ReadingPage;
