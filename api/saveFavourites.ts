import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectToDatabase() {
  if (!client.isConnected()) await client.connect();
  return client.db('your-database-name');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: 'Book ID is required' });
    }

    const db = await connectToDatabase();
    const collection = db.collection('favorites');

    await collection.updateOne(
      { userId },
      { $addToSet: { favorites: bookId } },
      { upsert: true }
    );

    return res.status(200).json({ message: 'Favorite saved' });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}