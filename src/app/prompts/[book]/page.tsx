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
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [suggestedBooks, setSuggestedBooks] = useState<Book[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (title) {
      const fetchBookDetails = async () => {
        try {
          const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=intitle:${title}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
          );
          if (!response.ok) {
            throw new Error('Failed to fetch book details from Google Books');
          }
          const data = await response.json();
          const bookData = data.items?.find(
            (item: { volumeInfo: { title: string } }) =>
              item.volumeInfo.title.toLowerCase() === title.toLowerCase()
          )?.volumeInfo;

          if (!bookData) {
            throw new Error('Book not found in Google Books');
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
          console.error('Error fetching book details from Google Books:', err);

          // Fallback to Open Library
          if (title) {
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
                  throw new Error(
                    'Book not found or missing cover in Open Library'
                  );
                }

                const book: Book = {
                  name: bookData.title,
                  author: bookData.author_name?.[0] || 'Unknown Author',
                  isbn: bookData.isbn?.[0] || 'Unknown ISBN',
                  image: `https://covers.openlibrary.org/b/id/${bookData.cover_i}-L.jpg`,
                  description: bookData.first_sentence?.value || null,
                  publisher: bookData.publisher?.[0] || null,
                  publishedDate: bookData.publish_date?.[0] || null,
                  pageCount: null,
                  categories: null,
                };

                setBook(book);
              }
            } catch (err) {
              console.error(
                'Error fetching book details from Open Library:',
                err
              );
            }
          }
        } finally {
          setLoading(false);
        }
      };

      fetchBookDetails();
    } else {
      setLoading(false);
    }
  }, [title]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!book || !book.isbn) return;

      setLoadingSuggestions(true);
      try {
        const result = await generatePrompts(`Books like ${book.name}`);
        if (result && result.books) {
          const booksWithImages = await Promise.all(
            result.books.map(async (b) => {
              const apiUrl = b.isbn
                ? `https://www.googleapis.com/books/v1/volumes?q=isbn:${b.isbn}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
                : null;
              if (apiUrl) {
                try {
                  const response = await fetch(apiUrl);
                  if (response.ok) {
                    const data = await response.json();
                    const bookData = data.items?.[0]?.volumeInfo;
                    if (bookData && bookData.imageLinks?.thumbnail) {
                      return {
                        ...b,
                        image: bookData.imageLinks.thumbnail,
                      };
                    }
                  }
                } catch (error) {
                  console.error(
                    `Error fetching data for ISBN: ${b.isbn} from Google Books`,
                    error
                  );
                }
              }

              const openLibraryUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${b.isbn}&jscmd=data&format=json`;
              try {
                const response = await fetch(openLibraryUrl);
                if (response.ok) {
                  const data = await response.json();
                  const bookData = data[`ISBN:${b.isbn}`];
                  if (bookData?.cover?.medium) {
                    return {
                      ...b,
                      image: bookData.cover.medium,
                    };
                  }
                }
              } catch (error) {
                console.error(
                  `Error fetching data for ISBN: ${b.isbn} from Open Library`,
                  error
                );
              }

              return null;
            })
          );
          const validBooks = booksWithImages.filter((b) => b !== null);
          // @ts-expect-error: Ignore type mismatch for validBooks
          setSuggestedBooks(validBooks);
        }
      } catch (err) {
        console.error('Error fetching suggestions from Google Books:', err);
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
    return <div></div>;
  }

  if (!book) {
    return <div>Book not found</div>;
  }

  return (
    <div className="max-w-lg mx-auto p-5">
      {/* Book Main Info Section */}
      <section className="mb-6">
        <div className="border rounded-lg shadow bg-white flex flex-row gap-6 p-4 items-center">
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <h1 className="text-2xl font-bold mb-2 break-words">{book.name}</h1>
            <p className="mb-1">
              <strong>Author:</strong> {book.author}
            </p>
            <p className="mb-1">
              <strong>ISBN:</strong> {book.isbn}
            </p>
            {book.publisher && (
              <p className="mb-1">
                <strong>Publisher:</strong> {book.publisher}
              </p>
            )}
            {book.publishedDate && (
              <p className="mb-1">
                <strong>Published Date:</strong> {book.publishedDate}
              </p>
            )}
            {book.pageCount && (
              <p className="mb-1">
                <strong>Page Count:</strong> {book.pageCount}
              </p>
            )}
            {book.categories && (
              <p className="mb-1">
                <strong>Categories:</strong> {book.categories.join(', ')}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 flex justify-center items-center">
            <img
              src={book.image || defaultCover.src}
              alt={`${book.name} cover`}
              className="w-32 h-48 object-cover rounded-lg shadow-md"
            />
          </div>
        </div>
      </section>

      <hr className="my-6" />

      {/* Description Section */}
      {book.description && (
        <section className="mb-4">
          <h2 className="font-semibold mb-1">Description:</h2>
          <span>
            {showFullDescription
              ? book.description
              : getShortDescription(book.description)}
            {!showFullDescription &&
              book.description.split('. ').length > 2 && (
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
          </span>
        </section>
      )}

      <hr className="my-6" />

      {/* Share Section */}
      <section className="mb-4">
        <button
          className="btn btn-primary mt-2 hover:bg-blue-600 transition-colors duration-300"
          onClick={handleShare}
        >
          Share this book
        </button>
        {linkCopied && (
          <p className="text-green-500 mt-2 animate-pulse">
            Link copied to clipboard!
          </p>
        )}
      </section>

      <hr className="my-6" />

      {/* Suggestions Section */}
      <section>
        {loadingSuggestions ? (
          <div className="flex justify-center items-center mt-12"></div>
        ) : (
          suggestedBooks.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">Books Like This</h2>
              {renderCarousel(suggestedBooks, 'suggested-slide')}
            </div>
          )
        )}
      </section>
    </div>
  );
};

export default BookPage;
