import { NextRequest, NextResponse } from 'next/server';

interface Book {
  name: string;
  author: string;
  isbn: string | null;
  image: string | null;
  description: string | null;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  categories: string[] | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title');

  if (!title) {
    console.error('Invalid title');
    return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
  }

  if (!process.env.GOOGLE_BOOKS_API_KEY) {
    console.error('Google Books API Key is not set');
    return NextResponse.json(
      { error: 'Google Books API Key is not set' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${title}&key=${process.env.GOOGLE_BOOKS_API_KEY}`
    );
    if (!response.ok) {
      console.error('Failed to fetch book details from Google Books API');
      throw new Error('Failed to fetch book details');
    }

    const data = await response.json();
    const bookData = data.items?.[0]?.volumeInfo;

    if (!bookData) {
      console.error('Book not found in Google Books API');
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const book: Book = {
      name: bookData.title,
      author: bookData.authors?.[0] || 'Unknown Author',
      isbn: bookData.industryIdentifiers?.[0]?.identifier || null,
      image: bookData.imageLinks?.thumbnail || null,
      description: bookData.description || null,
      publisher: bookData.publisher || null,
      publishedDate: bookData.publishedDate || null,
      pageCount: bookData.pageCount || null,
      categories: bookData.categories || null,
    };

    return NextResponse.json(book, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching book details:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
