'use client';

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [theme, setTheme] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500); // Simulate loading delay
    return () => clearTimeout(timer);
  }, []);

  if (!theme) {
    return null; // Render nothing until the theme is set
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Book Finder</h1>
      {loading ? (
        <div className="mt-4">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      ) : (
        <>
          <SignedIn>
            <Link href="/prompts">
              <button className="btn btn-primary mt-4">
                Find my next Book
              </button>
            </Link>
          </SignedIn>
          <SignedOut>
            <div className="mt-4">
              <SignInButton />
            </div>
          </SignedOut>
        </>
      )}
    </div>
  );
}
