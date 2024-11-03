'use client';

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import booksImage from './books.png';

export default function Home() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen">
      <SignedIn>
        <div className="absolute top-4 left-4">
          <UserButton />
        </div>
      </SignedIn>
      <h1 className="text-3xl font-bold mb-6">Book Finder</h1>
      <SignedOut>
        <Image src={booksImage} alt="Books" width={300} height={300} />
        <button className="btn btn-primary mt-4">
          <SignInButton />
        </button>
      </SignedOut>
    </div>
  );
}
