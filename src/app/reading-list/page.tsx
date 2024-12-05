'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';

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
  const [title, setTitle] = useState('');
  const [book, setBook] = useState<Book | null>(null);
  const [confirmedBook, setConfirmedBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagesRead, setPagesRead] = useState<number>(0);

  useEffect(() => {
    const fetchCurrentlyReading = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/clerk?userId=${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch currently reading book');
        }
        const data = await response.json();
        if (data.currentlyReading) {
          setConfirmedBook(data.currentlyReading.book);
          setPagesRead(data.currentlyReading.progress || 0);
          console.log(
            `Fetched progress: ${data.currentlyReading.progress || 0}`
          );
        }
      } catch (err) {
        console.error('Error fetching currently reading book:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentlyReading();
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

  const handleConfirm = async () => {
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

  return (
    <div className="max-w-lg mx-auto p-5">
      <h1 className="text-3xl font-bold mb-6 text-center">Currently Reading</h1>
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
          <p>
            <strong>Number of Pages:</strong>{' '}
            {confirmedBook.pageCount || 'Unknown'}
          </p>
          {confirmedBook.pageCount && (
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
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block mb-2">
              Book Title
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
      )}
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500 mt-4">{error}</div>}
      {book && !confirmedBook && (
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
          {book.pageCount && (
            <div className="mt-4">
              <p className="text-lg font-semibold">Is this your book?</p>
              <button className="btn btn-success mt-2" onClick={handleConfirm}>
                Yes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReadingPage;
