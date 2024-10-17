import type { NextApiRequest, NextApiResponse } from 'next';

interface Book {
  name: string;
  author: string;
  isbn: string;
  image: string | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { isbn } = req.query;

  if (!isbn || typeof isbn !== 'string') {
    return res.status(400).json({ error: 'Invalid ISBN' });
  }

  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch book details');
    }

    const data = await response.json();
    const bookData = data[`ISBN:${isbn}`];

    if (!bookData) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book: Book = {
      name: bookData.title,
      author: bookData.authors?.[0]?.name || 'Unknown Author',
      isbn,
      image: bookData.cover?.medium || null,
    };

    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
