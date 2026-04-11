import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '../../../../db';

interface Friend {
  id: string;
  name: string;
  profileImageUrl?: string; 
}

interface StoredFavorite {
  name: string;
  author: string;
  isbn: string;
  image?: string | null;
  averageRating?: number | null;
  ratingsCount?: number | null;
  addedAt?: string | null;
}

interface WebhookEvent {
  type: string;
  data: {
    userId?: string;
    isbn?: string;
    book?: Partial<StoredFavorite> | null;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getAddedAtTime = (addedAt?: string | null) => {
  if (!addedAt) {
    return 0;
  }

  const parsed = Date.parse(addedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortFavoritesByAddedAt = (favorites: StoredFavorite[]) =>
  [...favorites].sort(
    (left, right) => getAddedAtTime(right.addedAt) - getAddedAtTime(left.addedAt)
  );

const dedupeFavoritesByIsbn = (favorites: StoredFavorite[]) => {
  const seen = new Set<string>();

  return favorites.filter((favorite) => {
    if (seen.has(favorite.isbn)) {
      return false;
    }

    seen.add(favorite.isbn);
    return true;
  });
};

const normalizeFavorite = (
  favorite: unknown,
  index: number
): StoredFavorite | null => {
  if (!isRecord(favorite)) {
    return null;
  }

  const isbn =
    typeof favorite.isbn === 'string' ? favorite.isbn.trim() : '';

  if (!isbn) {
    return null;
  }

  const name =
    typeof favorite.name === 'string' && favorite.name.trim().length > 0
      ? favorite.name
      : 'Untitled';

  return {
    name,
    author: typeof favorite.author === 'string' ? favorite.author : '',
    isbn,
    image: typeof favorite.image === 'string' ? favorite.image : null,
    averageRating:
      typeof favorite.averageRating === 'number'
        ? favorite.averageRating
        : null,
    ratingsCount:
      typeof favorite.ratingsCount === 'number' ? favorite.ratingsCount : null,
    addedAt:
      typeof favorite.addedAt === 'string' &&
      !Number.isNaN(Date.parse(favorite.addedAt))
        ? favorite.addedAt
        : new Date((index + 1) * 1000).toISOString(),
  };
};

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

    const favorites = dedupeFavoritesByIsbn(
      sortFavoritesByAddedAt(
        (user.favorites || [])
          .map((favorite: unknown, index: number) =>
            normalizeFavorite(favorite, index)
          )
          .filter(
            (favorite: StoredFavorite | null): favorite is StoredFavorite =>
              favorite !== null
          )
      )
    );

    const userProfile = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      imageUrl: user.imageUrl,
      friends: friendsDetails,
      favorites,
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
      const favorite = normalizeFavorite(
        {
          ...book,
          addedAt: new Date().toISOString(),
        },
        0
      );

      if (userId && favorite) {
        await usersCollection.updateOne(
          { id: userId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { $pull: { favorites: { isbn: favorite.isbn } } as any }
        );

        await usersCollection.updateOne(
          { id: userId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { $push: { favorites: favorite } as any },
          { upsert: true }
        );

        return NextResponse.json({ favorite }, { status: 200 });
      }
    } else if (payload.type === 'remove.favorite') {
      const { userId, isbn } = payload.data;
      if (userId && isbn) {
        await usersCollection.updateOne(
          { id: userId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { $pull: { favorites: { isbn } } as any },
          { upsert: true }
        );

        return NextResponse.json({ removedIsbn: isbn }, { status: 200 });
      }
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
