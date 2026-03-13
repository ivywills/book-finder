import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../db';

export async function GET() {
  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    const mongoUsers = await usersCollection
      .find({ email: { $exists: true, $ne: '' } })
      .project({
        _id: 0,
        id: 1,
        email: 1,
        firstName: 1,
        lastName: 1,
        imageUrl: 1,
      })
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
  }
}
