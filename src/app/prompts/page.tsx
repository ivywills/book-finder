"use client";

import { useState } from 'react';
import { generatePrompts } from '../../actions/open-ai';
import { useUser } from '@clerk/nextjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart } from '@fortawesome/free-regular-svg-icons';

interface Book {
    name: string;
    author: string;
    isbn: string;
    image: string | null;
}

const HomePage = () => {
    const { user } = useUser();
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState<{ books: Book[] } | null>(null);
    const [favorites, setFavorites] = useState<Book[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const result = await generatePrompts(prompt);
            if (result) {
                const booksWithImages = await Promise.all(result.books.map(async (book) => {
                    const imageUrl = book.isbn ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg` : null;
                    if (imageUrl) {
                        const response = await fetch(imageUrl);
                        if (response.ok) {
                            const blob = await response.blob();
                            const image = new Image();
                            const imageLoadPromise = new Promise<Book | null>((resolve) => {
                                image.onload = () => {
                                    if (image.width >= 100 && image.height >= 150) {
                                        resolve({ ...book, image: imageUrl });
                                    } else {
                                        resolve(null);
                                    }
                                };
                                image.onerror = () => resolve(null);
                            });
                            image.src = URL.createObjectURL(blob);
                            const result = await imageLoadPromise;
                            if (result) {
                                return result;
                            }
                        }
                    }
                    return { ...book, image: null };
                }));
                const filteredBooks = booksWithImages.filter((book): book is Book => book.image !== null).slice(0, 20);
                setResult({ books: filteredBooks });
            }
        } catch (err) {
            setError('Failed to generate prompt');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const addToFavorites = (book: Book) => {
        setFavorites((prevFavorites) => {
            if (prevFavorites.some(fav => fav.isbn === book.isbn)) {
                return prevFavorites.filter(fav => fav.isbn !== book.isbn);
            } else {
                return [...prevFavorites, book];
            }
        });
    };

    const isFavorite = (book: Book) => {
        return favorites.some(fav => fav.isbn === book.isbn);
    };

    const renderCarousel = (books: Book[], idPrefix: string) => {
        const slides = [];
        const itemsPerSlide = window.innerWidth < 768 ? 3 : 5; // 3 items on mobile, 5 on larger screens
        for (let i = 0; i < books.length; i += itemsPerSlide) {
            slides.push(books.slice(i, i + itemsPerSlide));
        }

        return (
            <div className="carousel w-full">
                {slides.map((slide, index) => (
                    <div id={`${idPrefix}${index}`} className="carousel-item relative w-full flex justify-center" key={index}>
                        {slide.map((book) => (
                            <div key={book.isbn} className="card w-1/3 md:w-1/5 p-2 relative">
                                <img src={book.image!} alt={`${book.name} cover`} className="w-full h-48 object-cover" />
                                <div className="mt-2">
                                    <strong>{book.name}</strong>
                                    <p>{book.author}</p>
                                </div>
                                <button
                                    onClick={() => addToFavorites(book)}
                                    className="absolute top-2 right-2 text-2xl"
                                    title="Add to Favorites"
                                >
                                    <FontAwesomeIcon icon={isFavorite(book) ? solidHeart : regularHeart} className={isFavorite(book) ? 'text-red-500' : 'text-white'} />
                                </button>
                            </div>
                        ))}
                        <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
                            <a href={`#${idPrefix}${(index - 1 + slides.length) % slides.length}`} className="btn btn-circle">❮</a>
                            <a href={`#${idPrefix}${(index + 1) % slides.length}`} className="btn btn-circle">❯</a>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
            {user && 
                <div style={{ marginBottom: '20px' }}>
                    <h2>Welcome, {user.emailAddresses[0].emailAddress}!</h2>
                </div>
            }
            <h1>Prompt Generator</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="prompt">Enter your prompt:</label>
                    <textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
                        style={{ width: '100%' }}
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Generating...' : 'Generate'}
                </button>
            </form>
            {result && (
                <div style={{ marginTop: '20px' }}>
                    <h2>Response:</h2>
                    {renderCarousel(result.books, 'result-slide')}
                </div>
            )}
            {favorites.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h2>Favorites:</h2>
                    {renderCarousel(favorites, 'favorite-slide')}
                </div>
            )}
            {error && (
                <div style={{ color: 'red', marginTop: '20px' }}>
                    <h2>Error:</h2>
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
};

export default HomePage;