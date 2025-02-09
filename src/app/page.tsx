'use client';

import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from '@clerk/nextjs';
import Image from 'next/image';
import booksImage from './books.png';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [theme, setTheme] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme) {
        setTheme(storedTheme);
      } else {
        setTheme('light');
      }
    }
  }, []);

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  if (!theme) {
    return null; // Render nothing until the theme is set
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Book Finder</h1>
      <SignedIn>
        <div className="absolute top-4 left-4">
          <UserButton />
        </div>
        <Link href="/prompts">
          <button className="btn btn-primary mt-4">Find my next Book</button>
        </Link>
      </SignedIn>
      <SignedOut>
        <button className="btn btn-primary mt-4">
          <SignInButton />
        </button>
      </SignedOut>
    </div>
  );
}
