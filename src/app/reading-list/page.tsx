'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useClerk } from '@clerk/clerk-react';
import Image from 'next/image';
import defaultCover from '../default-cover.jpg';
import defaultProfilePic from '../friends/profile-pic.png';
import { PencilIcon } from '@heroicons/react/outline';

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
  const [error, setError] = useState<string | null>(null);
  const [pagesRead, setPagesRead] = useState<number>(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showArrows, setShowArrows] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchBooks = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/clerk?userId=${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch books');
        }
        const data = await response.json();
        console.log('Fetched data:', data); // Debugging line
        if (data.userProfile.currentlyReading) {
          setConfirmedBook(data.userProfile.currentlyReading.book);
          setPagesRead(data.userProfile.currentlyReading.progress || 0);
          console.log(
            `Fetched progress: ${
              data.userProfile.currentlyReading.progress || 0
            }`
          );
        }
        if (data.userProfile.completedBooks) {
          setCompletedBooks(data.userProfile.completedBooks);
        }
        if (data.userProfile.imageUrl) {
          setProfileImage(data.userProfile.imageUrl);
        }
      } catch (err) {
        console.error('Error fetching books:', err);
        setError((err as Error).message);
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
    setError(null);
    setBook(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=intitle:${title}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch book details');
      }
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        setBook(data.items[0].volumeInfo);
      } else {
        setError('Book not found');
      }
    } catch (err) {
      console.error('Error fetching book details:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCurrentlyReading = async () => {
    if (!user || !book) {
      setError('No user or book selected');
      return;
    }

    setLoading(true);
    setError(null);

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
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCompleted = async () => {
    if (!user || !book) {
      setError('No user or book selected');
      return;
    }

    setLoading(true);
    setError(null);

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
            book,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add completed book');
      }

      setCompletedBooks([...completedBooks, book]);
      setBook(null);
      setTitle('');
    } catch (err) {
      console.error('Error adding completed book:', err);
      setError((err as Error).message);
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
        console.log(`Updated progress: ${newPagesRead}`);
      } catch (err) {
        console.error('Error updating reading progress:', err);
        setError((err as Error).message);
      }
    }
  };

  const handleRemove = async () => {
    if (!user || !confirmedBook) {
      setError('No user or book selected');
      return;
    }

    setLoading(true);
    setError(null);

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
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!user || !e.target.files || e.target.files.length === 0) {
      setError('No user or file selected');
      return;
    }

    const file = e.target.files[0];
    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        await clerk.user?.setProfileImage({ file });
        setProfileImage(base64Image); // Update the profile image state

        // Update the profile image in the database
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

        // Optionally, you can refetch user data here to update the UI
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error updating profile image:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderCarousel = (books: Book[], idPrefix: string) => {
    const slides = [];
    const itemsPerSlide = 3; // 3 items on mobile, 5 on larger screens
    for (let i = 0; i < books.length; i += itemsPerSlide) {
      slides.push(books.slice(i, i + itemsPerSlide));
    }

    const handleDotClick = (index: number) => {
      setCurrentSlide(index);
      document
        .getElementById(`${idPrefix}${index}`)
        ?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleScroll = () => {
      const carousel = document.querySelector('.carousel');
      const scrollLeft = carousel?.scrollLeft || 0;
      const slideWidth = carousel?.clientWidth || 0;
      const newIndex = Math.round(scrollLeft / slideWidth);
      setCurrentSlide(newIndex);
    };

    return (
      <div>
        <div
          className="carousel w-full overflow-x-scroll snap-x snap-mandatory"
          onTouchStart={() => setShowArrows(false)}
          onTouchEnd={() => setShowArrows(true)}
          onScroll={handleScroll}
        >
          {slides.map((slide, index) => (
            <div
              id={`${idPrefix}${index}`}
              className="carousel-item relative w-full flex justify-center snap-center"
              key={index}
            >
              {slide.map((book) => (
                <div key={book.title} className="card w-1/3 p-2 relative">
                  <Image
                    src={book.imageLinks?.thumbnail || defaultCover.src}
                    alt={`${book.title} cover`}
                    width={96}
                    height={144}
                    className="object-cover"
                    onError={(e) => {
                      e.currentTarget.src = defaultCover.src;
                    }}
                    priority // Add priority property
                  />
                  <div className="mt-2">
                    <strong className="block truncate">{book.title}</strong>
                    <p className="block truncate">
                      {book.authors
                        ? book.authors.join(', ')
                        : 'Unknown Author'}
                    </p>
                  </div>
                </div>
              ))}
              {showArrows && (
                <div className="hidden md:flex absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
                  <a
                    href={`#${idPrefix}${
                      (index - 1 + slides.length) % slides.length
                    }`}
                    className="btn btn-circle"
                  >
                    ❮
                  </a>
                  <a
                    href={`#${idPrefix}${(index + 1) % slides.length}`}
                    className="btn btn-circle"
                  >
                    ❯
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-4 md:hidden">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`btn-secondary mx-1 w-2 h-2 rounded-full ${
                currentSlide === index ? 'bg-gray-800' : 'bg-gray-400'
              }`}
              onClick={() => handleDotClick(index)}
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
      <div className="mb-6 flex items-center relative">
        <Image
          src={profileImage || defaultProfilePic.src}
          alt="Profile"
          width={96}
          height={96}
          className="rounded-full object-cover"
        />
        <button
          className="btn btn-solid btn-sm btn-circle btn-primary -ml-6 -mb-16"
          onClick={() => setEditMode(!editMode)}
        >
          <PencilIcon className="h-5 w-5" />
        </button>

        <div className="ml-4">
          <h2 className="text-2xl font-bold">{user?.fullName}</h2>
          <p className="text-lg">Books Read: {completedBooks.length}</p>
        </div>
      </div>
      {editMode && (
        <>
          {/* Profile Image Upload Section */}
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block mb-2">
            Add Books
          </label>
          <input
            type="text"
            id="title"
            className="input input-bordered w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Search
        </button>
      </form>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500 mt-4">{error}</div>}
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
              priority // Add priority property
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
              onClick={handleConfirmCompleted}
            >
              Completed Books
            </button>
          </div>
        </div>
      )}
      <h1 className="text-xl font-bold mb-6 mt-8">Currently Reading</h1>
      {confirmedBook ? (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-xl font-bold mb-2">{confirmedBook.title}</h2>
          {confirmedBook.imageLinks && confirmedBook.imageLinks.thumbnail && (
            <Image
              src={confirmedBook.imageLinks.thumbnail}
              alt={`${confirmedBook.title} cover`}
              width={96}
              height={144}
              className="object-cover mb-2"
              priority // Add priority property
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
          <button className="btn btn-danger mt-4" onClick={handleRemove}>
            Remove
          </button>
        </div>
      ) : (
        <div>No book is currently being read.</div>
      )}
      <h1 className="text-xl font-bold mb-6 mt-8">Completed Books</h1>
      {completedBooks.length > 0 ? (
        renderCarousel(completedBooks, 'completed-slide')
      ) : (
        <div>No completed books yet.</div>
      )}
    </div>
  );
};

export default ReadingPage;
