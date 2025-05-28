'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import defaultCover from '../../default-cover.jpg';
import { generatePrompts } from '../../../actions/open-ai';
import Link from 'next/link';

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
}

const BookPage = () => {
  const pathname = usePathname();
  const title = decodeURIComponent(pathname.split('/').pop() || '');
  console.log(title);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [suggestedBooks, setSuggestedBooks] = useState<Book[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!book) return;

      setLoadingSuggestions(true);
      try {
        const result = await generatePrompts(`Books like ${book.name}`);
        if (result && result.books) {
          const booksWithImages = await Promise.all(
            result.books.map(async (b) => {
              const apiUrl = b.name
                ? `https://www.googleapis.com/books/v1/volumes?q=intitle:${b.name}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
                : null;
              if (apiUrl) {
                try {
                  const response = await fetch(apiUrl);
                  if (response.ok) {
                    const data = await response.json();
                    const bookData = data.items?.[0]?.volumeInfo;
                    if (bookData) {
                      return {
                        ...b,
                        image:
                          bookData.imageLinks?.thumbnail || defaultCover.src,
                      };
                    }
                  }
                } catch (error) {
                  console.error(
                    `Error fetching data for title: ${b.name}`,
                    error
                  );
                }
              }
              return { ...b, image: defaultCover.src };
            })
          );
          // @ts-expect-error: Ignore type mismatch for booksWithImages
          setSuggestedBooks(booksWithImages);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [book]);

  const handleShare = () => {
    const shareData = {
      title: book?.name,
      text: `Check out this book: ${book?.name} by ${book?.author}`,
      url: window.location.href,
    };

    navigator
      .share(shareData)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch((error) => {
        console.error('Error sharing:', error);
      });
  };

  const getShortDescription = (description: string) => {
    const sentences = description.split('. ');
    return (
      sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? ' ... ' : '')
    );
  };

  const renderCarousel = (books: Book[], idPrefix: string) => {
    const slides = [];
    const itemsPerSlide = 3;
    for (let i = 0; i < books.length; i += itemsPerSlide) {
      slides.push(books.slice(i, i + itemsPerSlide));
    }

    return (
      <div>
        <div className="carousel w-full overflow-x-scroll snap-x snap-mandatory">
          {slides.map((slide, index) => (
            <div
              id={`${idPrefix}${index}`}
              className="carousel-item relative w-full flex justify-center snap-center transition-transform duration-500 ease-in-out"
              key={index}
            >
              {slide.map((book) => (
                <div
                  key={book.isbn}
                  className="card w-1/3 p-2 relative hover:scale-105 transition-transform duration-300 ease-in-out"
                >
                  <img
                    src={book.image || defaultCover.src}
                    alt={`${book.name} cover`}
                    className="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
                    onError={(e) => {
                      e.currentTarget.src = defaultCover.src;
                    }}
                  />
                  <Link href={`/prompts/${encodeURIComponent(book.name)}`}>
                    <div className="mt-2">
                      <strong className="block truncate">{book.name}</strong>
                      <p className="block truncate">{book.author}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

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
          <strong>Description:</strong>{' '}
          {showFullDescription
            ? book.description
            : getShortDescription(book.description)}
          {!showFullDescription && book.description.split('. ').length > 2 && (
            <span
              className="text-blue-500 cursor-pointer"
              onClick={() => setShowFullDescription(true)}
            >
              Read more
            </span>
          )}
          {showFullDescription && (
            <span
              className="text-blue-500 cursor-pointer"
              onClick={() => setShowFullDescription(false)}
            >
              {' '}
              Read less
            </span>
          )}
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
      <button
        className="btn btn-primary mt-4 hover:bg-blue-600 transition-colors duration-300"
        onClick={handleShare}
      >
        Share this book
      </button>
      {linkCopied && (
        <p className="text-green-500 mt-2 animate-pulse">
          Link copied to clipboard!
        </p>
      )}
      {loadingSuggestions ? (
        <div className="flex justify-center items-center mt-6">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      ) : (
        suggestedBooks.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Books Like This</h2>
            {renderCarousel(suggestedBooks, 'suggested-slide')}
          </div>
        )
      )}
    </div>
  );
};

export default BookPage;
