import { WebhookEvent as ClerkWebhookEvent } from '@clerk/nextjs/server';

interface AddFavoriteEvent {
  type: 'add.favorite';
  data: {
    userId: string;
    book: string;
  };
}

interface AddCurrentlyReadingEvent {
  type: 'add.currentlyReading';
  data: {
    userId: string;
    book: Book;
  };
}

interface UpdateReadingProgressEvent {
  type: 'update.readingProgress';
  data: {
    userId: string;
    book: string;
    progress: number;
  };
}

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

type WebhookEvent = ClerkWebhookEvent | AddFavoriteEvent | AddCurrentlyReadingEvent | UpdateReadingProgressEvent;
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);

export async function POST(request: Request) {
  const payload: WebhookEvent = await request.json();

  if (payload.type === 'user.created') {
    const user = payload.data;
    await client.connect();
    const db = client.db('bookfinder');
    const usersCollection = db.collection('users');
    await usersCollection.insertOne({
      id: user.id,
      email: user.email_addresses[0].email_address,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: new Date(),
    });
  } else if (payload.type === 'add.favorite') {
    const { userId, book } = payload.data;
    await client.connect();
    const db = client.db('bookfinder');
    const usersCollection = db.collection('users');
    await usersCollection.updateOne(
      { id: userId },
      { $addToSet: { favorites: book } },
      { upsert: true }
    );
  } else if (payload.type === 'add.currentlyReading') {
    const { userId, book } = payload.data;
    await client.connect();
    const db = client.db('bookfinder');
    const usersCollection = db.collection('users');
    await usersCollection.updateOne(
      { id: userId },
      { $set: { currentlyReading: { book, progress: 0 } } },
      { upsert: true }
    );
  } else if (payload.type === 'update.readingProgress') {
    const { userId, book, progress } = payload.data;
    await client.connect();
    const db = client.db('bookfinder');
    const usersCollection = db.collection('users');
    await usersCollection.updateOne(
      { id: userId, 'currentlyReading.book.title': book },
      { $set: { 'currentlyReading.progress': progress } },
      { upsert: true }
    );
    console.log(`Updated progress for ${book}: ${progress}`);
  }

  console.log(payload);
  return new Response(JSON.stringify({ message: 'Received' }), { status: 200 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
  }

  try {
    await client.connect();
    const db = client.db('bookfinder');
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ id: userId });

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const favorites = user.favorites || [];
    const currentlyReading = user.currentlyReading || null;
    const progress = currentlyReading ? currentlyReading.progress : 0;
    console.log('Favorite Books:', favorites);
    console.log('Currently Reading:', currentlyReading);
    console.log('Progress:', progress);

    return new Response(JSON.stringify({ favorites, currentlyReading, progress }), { status: 200 });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch user data' }), { status: 500 });
  }
}