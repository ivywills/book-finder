'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import defaultCover from '../../default-cover.jpg';

interface Book {
  name: string;
  author: string;
  isbn: string;
  image: string | null;
  description: string | null;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  categories: string[] | null;
  reviews: Review[] | null;
}

interface Review {
  author: string;
  content: string;
  rating: number;
}

const BookPage = () => {
  const pathname = usePathname();
  const title = decodeURIComponent(pathname.split('/').pop() || '');
  console.log(title);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (title) {
      const fetchBookDetails = async () => {
        try {
          console.log(`Fetching book details for title: ${title}`);
          const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=intitle:${title}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
          );
          if (!response.ok) {
            throw new Error('Failed to fetch book details');
          }
          const data = await response.json();
          console.log('Book details fetched successfully:', data);
          const bookData = data.items?.[0]?.volumeInfo;

          if (!bookData) {
            throw new Error('Book not found');
          }

          const reviews = bookData.reviews || [];

          const book: Book = {
            name: bookData.title,
            author: bookData.authors?.[0] || 'Unknown Author',
            isbn:
              bookData.industryIdentifiers?.[0]?.identifier || 'Unknown ISBN',
            image: bookData.imageLinks?.thumbnail || null,
            description: bookData.description || null,
            publisher: bookData.publisher || null,
            publishedDate: bookData.publishedDate || null,
            pageCount: bookData.pageCount || null,
            categories: bookData.categories || null,
            reviews: reviews.map((review: any) => ({
              author: review.author || 'Anonymous',
              content: review.content || '',
              rating: review.rating || 0,
            })),
          };

          setBook(book);
        } catch (err) {
          console.error('Error fetching book details:', err);
          setError((err as Error).message);
        } finally {
          setLoading(false);
        }
      };

      fetchBookDetails();
    } else {
      setLoading(false);
      setError('Title not provided');
    }
  }, [title]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!book) {
    return <div>Book not found</div>;
  }

  return (
    <div className="max-w-lg mx-auto p-5">
      <h1 className="text-3xl font-bold mb-6">{book.name}</h1>
      <img
        src={book.image || defaultCover.src}
        alt={`${book.name} cover`}
        className="w-full h-full object-cover mb-4"
      />
      <p>
        <strong>Author:</strong> {book.author}
      </p>
      <p>
        <strong>ISBN:</strong> {book.isbn}
      </p>
      {book.description && (
        <p>
          <strong>Description:</strong> {book.description}
        </p>
      )}
      {book.publisher && (
        <p>
          <strong>Publisher:</strong> {book.publisher}
        </p>
      )}
      {book.publishedDate && (
        <p>
          <strong>Published Date:</strong> {book.publishedDate}
        </p>
      )}
      {book.pageCount && (
        <p>
          <strong>Page Count:</strong> {book.pageCount}
        </p>
      )}
      {book.categories && (
        <p>
          <strong>Categories:</strong> {book.categories.join(', ')}
        </p>
      )}
      {book.reviews && book.reviews.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mt-6 mb-4">Reviews</h2>
          <ul className="space-y-4">
            {book.reviews.map((review, index) => (
              <li key={index} className="border p-4 rounded-lg">
                <p>
                  <strong>Author:</strong> {review.author}
                </p>
                <p>
                  <strong>Rating:</strong> {review.rating}/5
                </p>
                <p>{review.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BookPage;
