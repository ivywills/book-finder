import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../db';

interface Friend {
  id: string;
  name: string;
  profileImageUrl?: string; 
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
      image_url?: string; 
    };
    imageUrl?: string; 
    email?: string;
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');
  const search = searchParams.get('search');

  if (search !== null) {
    try {
      const db = await connectToDatabase();
      const usersCollection = db.collection('users');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = {};
      if (search && search.trim().length > 0) {
        const regex = new RegExp(search, 'i');
        query = {
          $or: [
            { firstName: regex },
            { lastName: regex },
            { email: regex }
          ]
        };
      }
      const mongoUsers = await usersCollection
        .find({ ...query, email: { $exists: true, $ne: '' } })
        .project({
          _id: 0,
          id: 1,
          email: 1,
          firstName: 1,
          lastName: 1,
          imageUrl: 1,
        })
        .limit(10)
        .toArray();

      const users = mongoUsers.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        imageUrl: u.imageUrl || '',
      }));

      return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ users: [] }, { status: 200 });
    }
    return;
  }

  if (email) {
    return getUserIdByEmail(email);
  }

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne(
      { id: userId },
      {
        projection: {
          _id: 0,
          id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          imageUrl: 1,
          friends: 1,
          favorites: 1,
          currentlyReading: 1,
          completedBooks: 1,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.imageUrl) {
      user.imageUrl = '';
      await usersCollection.updateOne(
        { id: userId },
        { $set: { imageUrl: '' } }
      );
    }

    const friendIds = (user.friends || [])
      .map((friend: Friend) => friend.id)
      .filter(Boolean);

    const friendDocs = friendIds.length
      ? await usersCollection
          .find({ id: { $in: friendIds } })
          .project({
            _id: 0,
            id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            imageUrl: 1,
          })
          .toArray()
      : [];

    const friendById = new Map(friendDocs.map((friend) => [friend.id, friend]));

    const friendsDetails = (user.friends || []).map((friend: Friend) => {
      const friendDetails = friendById.get(friend.id);
      const resolvedName = [friendDetails?.firstName, friendDetails?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

      return {
        id: friend.id,
        name: resolvedName || friend.name,
        email: friendDetails?.email,
        profileImageUrl: friendDetails?.imageUrl,
      };
    });

    const userProfile = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      imageUrl: user.imageUrl,
      friends: friendsDetails,
      favorites: user.favorites || [], 
      currentlyReading: user.currentlyReading || null, 
      completedBooks: user.completedBooks || [], 
    };

    return NextResponse.json({ userProfile }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

async function getUserIdByEmail(email: string) {
  try {
    const db = await connectToDatabase();
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
  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    if (payload.type === 'user.created') {
      const user = payload.data.user;
      if (user) {
        await usersCollection.updateOne(
          { id: user.id },
          {
            $setOnInsert: {
              createdAt: new Date(),
              favorites: [],
              currentlyReading: null,
              completedBooks: [],
            },
            $set: {
              email: user.email_addresses[0].email_address,
              firstName: user.first_name,
              lastName: user.last_name,
              imageUrl: user.image_url || '',
            },
          },
          { upsert: true }
        );
      }
    } else if (payload.type === 'add.favorite') {
      const { userId, book } = payload.data;
      await usersCollection.updateOne(
        { id: userId },
        { $addToSet: { favorites: book } },
        { upsert: true }
      );
    } else if (payload.type === 'remove.favorite') {
      const { userId, isbn } = payload.data;
      await usersCollection.updateOne(
        { id: userId },
        { $pull: { favorites: { isbn } } },
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
    } else if (payload.type === 'add.completedBook') {
      const { userId, book } = payload.data;
      await usersCollection.updateOne(
        { id: userId },
        { $addToSet: { completedBooks: book } },
        { upsert: true }
      );
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
      await usersCollection.updateOne(
        { id: userId },
        { $unset: { currentlyReading: '' } }
      );
    } else if (payload.type === 'update.profileImage') {
      const { userId, imageUrl } = payload.data;
      await usersCollection.updateOne({ id: userId }, { $set: { imageUrl } });
    } else if (payload.type === 'update.email') {
      const { userId, email } = payload.data;
      if (userId && email) {
        await usersCollection.updateOne({ id: userId }, { $set: { email } });
      }
      return NextResponse.json({ message: 'Email updated' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Received' }, { status: 200 });
  } catch (error) {
    console.error('Error processing Clerk route POST:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
