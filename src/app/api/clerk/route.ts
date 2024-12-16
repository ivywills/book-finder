import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

interface Friend {
  id: string;
  name: string;
}

interface WebhookEvent {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

const client = new MongoClient(process.env.MONGODB_URI!);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    await client.connect();
    const db = client.db('bookfinder');
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ id: userId });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('Fetched user profile:', user);

    const userProfile = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      friends: user.friends || [] as Friend[],
    };

    return NextResponse.json({ userProfile }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const payload: WebhookEvent = await request.json();

  await client.connect();
  const db = client.db('bookfinder');
  const usersCollection = db.collection('users');

  if (payload.type === 'user.created') {
    const user = payload.data;
    await usersCollection.insertOne({
      id: user.id,
      email: user.email_addresses[0].email_address,
      firstName: user.first_name,
      lastName: user.last_name,
      createdAt: new Date(),
    });
  } else if (payload.type === 'add.favorite') {
    const { userId, book } = payload.data;
    await usersCollection.updateOne(
      { id: userId },
      { $addToSet: { favorites: book } },
      { upsert: true }
    );
  } else if (payload.type === 'add.currentlyReading') {
    const { userId, book } = payload.data;
    await usersCollection.updateOne(
      { id: userId },
      { $set: { currentlyReading: { book, progress: 0 } } },
      { upsert: true }
    );
  } else if (payload.type === 'update.readingProgress') {
    const { userId, book, progress } = payload.data;
    await usersCollection.updateOne(
      { id: userId, 'currentlyReading.book.title': book },
      { $set: { 'currentlyReading.progress': progress } },
      { upsert: true }
    );
    console.log(`Updated progress for ${book}: ${progress}`);
  } else if (payload.type === 'add.friend') {
    const { userId, friendId, friendName } = payload.data;
    await usersCollection.updateOne(
      { id: userId },
      { $addToSet: { friends: { id: friendId, name: friendName } as Friend } },
      { upsert: true }
    );
  } else if (payload.type === 'remove.friend') {
    const { userId, friendId } = payload.data;
    await usersCollection.updateOne(
      { id: userId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $pull: { friends: { id: friendId } as any } }
    );
  }

  console.log(payload);
  return new Response(JSON.stringify({ message: 'Received' }), { status: 200 });
}