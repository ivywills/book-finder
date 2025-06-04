import type { Metadata } from 'next';
import localFont from 'next/font/local';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';
import './globals.css';
import ThemeToggle from './theme-toggle';
import ConvexClientProvider from './ConvexClientProvider';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Book Finder',
  description: 'Find your next favorite book using AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>
          <ConvexClientProvider>
            <SignedIn>
              <div className="navbar bg-base-100 shadow-md sticky top-0 mb-4 z-50">
                <div className="flex-1 flex items-center">
                  <div className="absolute top-5 left-4">
                    {' '}
                    {/* Adjusted top to 6 */}
                    <UserButton />
                  </div>
                </div>
                <div className="flex-none">
                  {/* Desktop Menu */}
                  <ul className="hidden md:flex menu menu-horizontal px-[0.25rem]">
                    <li>
                      <a href="/prompts">Discover</a>
                    </li>
                    <li>
                      <a href="/reading-list">Profile</a>
                    </li>
                    <li>
                      <a href="/friends">Friends</a>
                    </li>
                    <li>
                      <ThemeToggle />
                    </li>
                  </ul>

                  {/* Mobile Hamburger Menu */}
                  <div className="md:hidden dropdown dropdown-end">
                    <label
                      tabIndex={0}
                      className="btn btn-ghost btn-circle"
                      aria-label="Open Menu"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 6h16M4 12h16m-7 6h7"
                        />
                      </svg>
                    </label>
                    <ul
                      tabIndex={0}
                      className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52"
                    >
                      <li>
                        <a href="/prompts">Discover</a>
                      </li>
                      <li>
                        <a href="/reading-list">Profile</a>
                      </li>
                      <li>
                        <a href="/friends">Friends</a>
                      </li>
                      <li>
                        <ThemeToggle />
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </SignedIn>
            <SignedOut>
              <div className="flex justify-end p-4">
                <SignInButton />
                <div className="px-2">/</div>
                <SignUpButton />
              </div>
            </SignedOut>
            {children}
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
