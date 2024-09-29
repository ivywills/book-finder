"use client";

import { useState } from 'react';
import { generatePrompts } from '../../actions/open-ai';
import { useUser } from '@clerk/nextjs';

interface Book {
    name: string;
    author: string;
    isbn: string;
    image: string | null;
}

const HomePage = () => {
    const { user } = useUser();
    console.log(user);
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState<{ books: Book[] } | null>(null);
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
                const filteredBooks = booksWithImages.filter((book): book is Book => book.image !== null).slice(0, 5);
                setResult({ books: filteredBooks });
            }
        } catch (err) {
            setError('Failed to generate prompt');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
            {user && 
                <div style={{ marginBottom: '20px' }}>
                    <h2>Welcome, {user.emailAddresses[0].emailAddress}!</h2>
                </div>
            )}
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
                    <ul>
                        {result.books.map((book) => (
                            book.image && (
                                <li key={book.isbn} style={{ marginBottom: '20px' }}>
                                    <img src={book.image} alt={`${book.name} cover`} style={{ width: '100px', height: '150px', marginRight: '10px' }} />
                                    <div>
                                        <strong>{book.name}</strong> by {book.author} (ISBN: {book.isbn})
                                    </div>
                                </li>
                            )
                        ))}
                    </ul>
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