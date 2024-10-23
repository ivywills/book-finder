'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { generatePrompts } from '../../actions/open-ai';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart } from '@fortawesome/free-regular-svg-icons';
import defaultCover from '../default-cover.jpg';
import { StaticImageData } from 'next/image';

interface Book {
  name: string;
  author: string;
  isbn: string;
  image: string | StaticImageData | null;
}

const HomePage = () => {
  const { user } = useUser();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<{ books: Book[] } | null>(null);
  const [favorites, setFavorites] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArrows, setShowArrows] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;

      try {
        const userId = user.id;
        const response = await fetch(`/api/clerk?userId=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch favorites');
        }
        const data = await response.json();
        setFavorites(data.favorites);
        console.log('Favorite Books:', data.favorites);
      } catch (error) {
        console.error('Error fetching favorites:', error);
        setError('Failed to fetch favorites');
      }
    };

    fetchFavorites();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await generatePrompts(prompt);
      if (result) {
        // Set the result immediately with books with default cover images
        setResult({
          books: result.books.map((book) => ({
            ...book,
            image: defaultCover.src,
          })),
        });

        // Fetch images asynchronously
        const booksWithImages = await Promise.all(
          result.books.map(async (book) => {
            const apiUrl = book.isbn
              ? `https://www.googleapis.com/books/v1/volumes?q=isbn:${book.isbn}&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
              : null;
            if (apiUrl) {
              try {
                const response = await fetch(apiUrl);
                if (response.ok) {
                  const data = await response.json();
                  const bookData = data.items?.[0]?.volumeInfo;
                  if (bookData && bookData.imageLinks?.thumbnail) {
                    return { ...book, image: bookData.imageLinks.thumbnail };
                  } else {
                    console.error(`No image found for ISBN: ${book.isbn}`);
                  }
                } else {
                  console.error(`Failed to fetch image for ISBN: ${book.isbn}`);
                }
              } catch (error) {
                console.error(
                  `Error fetching image for ISBN: ${book.isbn}`,
                  error
                );
              }
            }
            return { ...book, image: defaultCover.src };
          })
        );

        // Update the result with books with images
        setResult({ books: booksWithImages });
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
      const response = await fetch('/api/clerk', {
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

  const renderCarousel = (books: Book[], idPrefix: string) => {
    const slides = [];
    const itemsPerSlide = 3; // 3 items on mobile, 5 on larger screens
    for (let i = 0; i < books.length; i += itemsPerSlide) {
      slides.push(books.slice(i, i + itemsPerSlide));
    }

    return (
      <div
        className="carousel w-full"
        onTouchStart={() => setShowArrows(false)}
        onTouchEnd={() => setShowArrows(true)}
      >
        {slides.map((slide, index) => (
          <div
            id={`${idPrefix}${index}`}
            className="carousel-item relative w-full flex justify-center"
            key={index}
          >
            {slide.map((book) => (
              <div key={book.isbn} className="card w-1/3 p-2 relative">
                <img
                  src={
                    typeof book.image === 'string'
                      ? book.image
                      : defaultCover.src
                  }
                  alt={`${book.name} cover`}
                  className="w-full h-48 object-cover"
                />
                <Link href={`/prompts/${book.isbn}`}>
                  <div className="mt-2">
                    <strong>{book.name}</strong>
                    <p>{book.author}</p>
                  </div>
                </Link>
                <button
                  onClick={() => addToFavorites(book)}
                  className="absolute top-2 right-2 text-2xl"
                  title="Add to Favorites"
                >
                  <FontAwesomeIcon
                    icon={isFavorite(book) ? solidHeart : regularHeart}
                    className={isFavorite(book) ? 'text-red-500' : 'text-white'}
                  />
                </button>
              </div>
            ))}
            {showArrows && (
              <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
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
    );
  };

  return (
    <div className="max-w-lg mx-auto p-5">
      <h1 className="text-3xl font-bold mb-6">Book Finder</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="prompt">Please enter some books you like:</label>
          <textarea
            id="prompt"
            className="textarea textarea-primary w-full focus:outline-none focus:ring-0"
            placeholder="Enter a few books you like..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />
        </div>
        <button type="submit" className="btn" disabled={loading}>
          {loading ? (
            <>
              <span className="loading loading-spinner"></span>
              Finding Books
            </>
          ) : (
            'Find Books'
          )}
        </button>
      </form>
      {result && (
        <div className="mt-5">
          <h2>Suggested Reads:</h2>
          {renderCarousel(result.books, 'result-slide')}
        </div>
      )}
      {favorites.length > 0 && (
        <div className="mt-5">
          <h2>Favorites:</h2>
          {renderCarousel(favorites, 'favorite-slide')}
        </div>
      )}
      {error && (
        <div className="text-red-500 mt-5">
          <h2>Error:</h2>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
