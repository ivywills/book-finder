import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);

export async function GET() {
  try {
    await client.connect();
    const db = client.db('bookfinder');
    const usersCollection = db.collection('users');
    const mongoUsers = await usersCollection
      .find({ email: { $exists: true, $ne: '' } })
      .limit(50)
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
    return NextResponse.json({ users: [] }, { status: 200 });
  } finally {
    await client.close();
  }
}
