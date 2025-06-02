'use client';

import { useState, useEffect } from 'react';
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

      const fetchCompletedBooks = await fetch(`/api/clerk?userId=${user.id}`);
      if (fetchCompletedBooks.ok) {
        const data = await fetchCompletedBooks.json();
        setCompletedBooks(data.userProfile.completedBooks || []);
      }

      setBook(null);
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
                  key={book.title}
                  className="card w-1/3 p-4 relative hover:scale-105 transition-transform duration-300"
                >
                  <Image
                    src={book.imageLinks?.thumbnail || defaultCover.src}
                    alt={`${book.title} cover`}
                    width={150}
                    height={225}
                    className="object-cover rounded-lg shadow-md w-full h-full"
                    onError={(e) => {
                      e.currentTarget.src = defaultCover.src;
                    }}
                  />
                  <div className="mt-2">
                    <strong className="block truncate text-center">
                      {book.title}
                    </strong>
                    <p className="block truncate text-center">
                      {book.authors
                        ? book.authors.join(', ')
                        : 'Unknown Author'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
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

  if (initialLoad || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-5">
      {/* User Information */}
      <h1 className="font-bold mb-6 text-center text-2xl">Profile</h1>
      <label
        htmlFor="prompt"
        className="block mb-4 text-lg text-primary text-center"
      >
        Start tracking the books you've loved — and the one you're reading right
        now!
      </label>
      <h1 className="text-l font-bold mb-6 mt-2">User Information</h1>
      <div className="mb-6 flex items-center relative">
        <Image
          src={profileImage || defaultProfilePic.src}
          alt="Profile"
          width={96}
          height={96}
          className="rounded-full object-cover aspect-square"
        />
        <button
          className="btn btn-solid btn-sm btn-circle btn-primary -ml-6 -mb-16"
          onClick={() => setEditMode(!editMode)}
        >
          <PencilIcon className="h-5 w-5" />
        </button>

        <div className="ml-4">
          <h2 className="text-2xl font-bold">
            {user
              ? user.fullName || user.primaryEmailAddress?.toString()
              : 'Guest'}
          </h2>
          <p className="text-lg">Books Read: {completedBooks.length}</p>
        </div>
      </div>
      {editMode && (
        <>
          <div className="mb-6">
            <label htmlFor="profileImage" className="block mb-2">
              Upload Profile Image
            </label>
            <input
              type="file"
              id="profileImage"
              className="input w-full"
              accept="image/*"
              onChange={handleProfileImageChange}
            />
          </div>
        </>
      )}
      <hr className="border-t-2 border-primary my-6" />
      <h1 className="text-l font-bold mb-6 mt-8">Add a book to Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block mb-2">
            Add a book you're currently reading to track your progress, or
            showcase a favorite you've already finished to share with friends!
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              id="title"
              className="input input-bordered flex-grow"
              placeholder="🔍 Enter book title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </div>
        </div>
      </form>
      {loading && <div></div>}
      {book && (
        <div className="mt-6 p-4 border rounded-lg">
          <h2 className="text-xl font-bold mb-2">{book.title}</h2>
          {book.imageLinks && book.imageLinks.thumbnail && (
            <Image
              src={book.imageLinks.thumbnail}
              alt={`${book.title} cover`}
              width={96}
              height={144}
              className="object-cover mb-2"
            />
          )}
          <p>
            <strong>Author:</strong>{' '}
            {book.authors ? book.authors.join(', ') : 'Unknown Author'}
          </p>
          <p>
            <strong>Publisher:</strong> {book.publisher || 'Unknown Publisher'}
          </p>
          <p>
            <strong>Published Date:</strong>{' '}
            {book.publishedDate || 'Unknown Date'}
          </p>
          <p>
            <strong>Number of Pages:</strong> {book.pageCount || 'Unknown'}
          </p>
          <div className="mt-4">
            <p className="text-lg font-semibold">Add this book to:</p>
            <button
              className="btn btn-success mt-2 mr-2"
              onClick={handleConfirmCurrentlyReading}
            >
              Currently Reading
            </button>
            <button
              className="btn btn-success mt-2"
              onClick={() => {
                if (book) {
                  handleConfirmCompleted(book);
                }
              }}
            >
              Completed Books
            </button>
          </div>
        </div>
      )}
      <hr className="border-t-2 border-primary my-6" />
      <h1 className="text-l font-bold mb-6 mt-8">Currently Reading</h1>
      {confirmedBook ? (
        <div className="mb-6 p-4 border rounded-lg bg-base-300">
          <h2 className="text-xl font-bold mb-2">{confirmedBook.title}</h2>
          {confirmedBook.imageLinks && confirmedBook.imageLinks.thumbnail && (
            <Image
              src={confirmedBook.imageLinks.thumbnail}
              alt={`${confirmedBook.title} cover`}
              width={96}
              height={144}
              className="object-cover mb-2"
            />
          )}
          <p>
            <strong>Author:</strong>{' '}
            {confirmedBook.authors
              ? confirmedBook.authors.join(', ')
              : 'Unknown Author'}
          </p>
          <p>
            <strong>Publisher:</strong>{' '}
            {confirmedBook.publisher || 'Unknown Publisher'}
          </p>
          <p>
            <strong>Published Date:</strong>{' '}
            {confirmedBook.publishedDate || 'Unknown Date'}
          </p>
          {!!confirmedBook.pageCount && (
            <>
              <p>
                <strong>Number of Pages:</strong>{' '}
                {confirmedBook.pageCount || 'Unknown'}
              </p>

              <div className="mt-4">
                <label htmlFor="pagesRead" className="block mb-2">
                  Pages Read: {pagesRead} / {confirmedBook.pageCount}
                </label>
                <input
                  type="range"
                  id="pagesRead"
                  min="0"
                  max={confirmedBook.pageCount}
                  value={pagesRead}
                  onChange={handlePagesReadChange}
                  className="range range-secondary w-full"
                />
              </div>
            </>
          )}
          <button
            className="btn mt-4 mx-2"
            aria-label="complete"
            onClick={async () => {
              if (confirmedBook) {
                await handleConfirmCompleted(confirmedBook);
                await handleRemove();
              }
            }}
          >
            <CheckCircleIcon className="h-5 w-5" />
            Complete
          </button>
          <button
            className="btn mt-4 mx-2"
            aria-label="remove"
            onClick={handleRemove}
          >
            <TrashIcon className="h-5 w-5" />
            Remove
          </button>
        </div>
      ) : (
        <div>
          No book is currently being read. Please use the search above to add
          the book you are currently reading.
        </div>
      )}
      <hr className="border-t-2 border-primary my-6" />
      <h1 className="text-l font-bold mb-6 mt-8">Completed Books</h1>
      {completedBooks.length > 0 ? (
        renderCarousel(
          completedBooks,
          'completed-slide',
          currentSlide,
          setCurrentSlide
        )
      ) : (
        <div>
          No completed books yet. Please use the search above to add the books
          you've completed.
        </div>
      )}
    </div>
  );
};

export default ReadingPage;
