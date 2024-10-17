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
  const isbn = searchParams.get('isbn');

  console.log('Request URL:', req.url);
  console.log('ISBN:', isbn);

  //   if (!isbn) {
  //     console.error('Invalid ISBN');
  //     return NextResponse.json({ error: 'Invalid ISBN' }, { status: 400 });
  //   }

  try {
    console.log(`Fetching book details for ISBN: ${isbn}`);
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
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
      isbn,
      image: bookData.imageLinks?.thumbnail || null,
      description: bookData.description || null,
      publisher: bookData.publisher || null,
      publishedDate: bookData.publishedDate || null,
      pageCount: bookData.pageCount || null,
      categories: bookData.categories || null,
    };

    console.log('Book details fetched successfully:', book);
    return NextResponse.json(book, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching book details:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
