import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

interface Friend {
  id: string;
  name: string;
  profileImageUrl?: string; // Add profile image URL
}

interface WebhookEvent {
  type: string;
  data: {
    userId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    book?: any;
    friendId?: string;
    friendName?: string;
    progress?: number;
    user?: {
      id: string;
      email_addresses: { email_address: string }[];
      first_name: string;
      last_name: string;
      image_url?: string; // Add image_url
    };
    imageUrl?: string; // Add imageUrl for profile image update
  };
}

const client = new MongoClient(process.env.MONGODB_URI!);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  if (email) {
    return getUserIdByEmail(email);
  }

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

    // Ensure imageUrl field exists
    if (!user.imageUrl) {
      user.imageUrl = '';
      await usersCollection.updateOne(
        { id: userId },
        { $set: { imageUrl: '' } }
      );
    }

    const friendsDetails = await Promise.all(
      (user.friends || []).map(async (friend: Friend) => {
        const friendDetails = await usersCollection.findOne({ id: friend.id });
        return {
          id: friend.id,
          name: friendDetails?.firstName + ' ' + friendDetails?.lastName || friend.name,
          email: friendDetails?.email,
          profileImageUrl: friendDetails?.imageUrl, // Add profile image URL
        };
      })
    );

    const userProfile = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      imageUrl: user.imageUrl, // Add imageUrl
      friends: friendsDetails,
      favorites: user.favorites || [], // Ensure favorites is included in the response
      currentlyReading: user.currentlyReading || null, // Ensure currentlyReading is included in the response
      completedBooks: user.completedBooks || [], // Ensure completedBooks is included in the response
    };

    return NextResponse.json({ userProfile }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

async function getUserIdByEmail(email: string) {
  try {
    await client.connect();
    const db = client.db('bookfinder');
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ userId: user.id }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user ID by email:', error);
    return NextResponse.json({ error: 'Failed to fetch user ID' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: WebhookEvent = await req.json();

  await client.connect();
  const db = client.db('bookfinder');
  const usersCollection = db.collection('users');

  if (payload.type === 'user.created') {
    const user = payload.data.user;
    if (user) {
      await usersCollection.insertOne({
        id: user.id,
        email: user.email_addresses[0].email_address,
        firstName: user.first_name,
        lastName: user.last_name,
        imageUrl: user.image_url, // Add imageUrl
        createdAt: new Date(),
        favorites: [], // Initialize favorites as an empty array
        currentlyReading: null, // Initialize currentlyReading as null
        completedBooks: [], // Initialize completedBooks as an empty array
      });
    }
  } else if (payload.type === 'add.favorite') {
    const { userId, book } = payload.data;
    console.log('Adding favorite book:', book); // Debugging line
    const result = await usersCollection.updateOne(
      { id: userId },
      { $addToSet: { favorites: book } },
      { upsert: true }
    );
    console.log('Update result:', result); // Debugging line
  } else if (payload.type === 'add.currentlyReading') {
    const { userId, book } = payload.data;
    console.log('Adding currently reading book:', book); // Debugging line
    const result = await usersCollection.updateOne(
      { id: userId },
      { $set: { currentlyReading: { book, progress: 0 } } },
      { upsert: true }
    );
    console.log('Update result:', result); // Debugging line
  } else if (payload.type === 'update.readingProgress') {
    const { userId, book, progress } = payload.data;
    console.log(`Updating progress for ${book}: ${progress}`); // Debugging line
    const result = await usersCollection.updateOne(
      { id: userId, 'currentlyReading.book.title': book },
      { $set: { 'currentlyReading.progress': progress } },
      { upsert: true }
    );
    console.log('Update result:', result); // Debugging line
  } else if (payload.type === 'add.completedBook') {
    const { userId, book } = payload.data;
    console.log('Adding completed book:', book); // Debugging line
    const result = await usersCollection.updateOne(
      { id: userId },
      { $addToSet: { completedBooks: book } },
      { upsert: true }
    );
    console.log('Update result:', result); // Debugging line
  } else if (payload.type === 'add.friend') {
    const { userId, friendId, friendName } = payload.data;
    await usersCollection.updateOne(
      { id: userId },
      { $addToSet: { friends: { id: friendId, name: friendName } } },
      { upsert: true }
    );
  } else if (payload.type === 'remove.friend') {
    const { userId, friendId } = payload.data;
    if (friendId) {
      await usersCollection.updateOne(
        { id: userId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { $pull: { friends: { id: friendId } as any } }
      );
    }
  } else if (payload.type === 'remove.currentlyReading') {
    const { userId } = payload.data;
    console.log('Removing currently reading book for user:', userId); // Debugging line
    const result = await usersCollection.updateOne(
      { id: userId },
      { $unset: { currentlyReading: "" } }
    );
    console.log('Update result:', result); // Debugging line
  } else if (payload.type === 'update.profileImage') {
    const { userId, imageUrl } = payload.data;
    console.log('Updating profile image for user:', userId); // Debugging line
    const result = await usersCollection.updateOne(
      { id: userId },
      { $set: { imageUrl } }
    );
    console.log('Update result:', result); // Debugging line
  }

  console.log(payload);
  return NextResponse.json({ message: 'Received' }, { status: 200 });
}