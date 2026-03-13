import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not defined');
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient__: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var __mongoConnected__: boolean | undefined;
}

const client = global.__mongoClient__ ?? new MongoClient(uri);
let isConnected = global.__mongoConnected__ ?? false;

if (!global.__mongoClient__) {
  global.__mongoClient__ = client;
}

async function connectToDatabase() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    global.__mongoConnected__ = true;
  }
  return client.db('bookfinder');
}

export default connectToDatabase;
