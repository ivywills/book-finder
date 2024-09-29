import { WebhookEvent } from '@clerk/nextjs/server';
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
  }

  console.log(payload);
  return new Response(JSON.stringify({ message: 'Received' }), { status: 200 });
}

export async function GET() {
  return new Response(JSON.stringify({ message: 'Hello World!' }), { status: 200 });
}