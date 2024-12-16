import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import ThemeToggle from './theme-toggle';

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>
          <div className="navbar bg-base-100">
            <div className="flex-1 flex items-center">
              <a href="/" className="md:block hidden text-xl">
                Book Finder
              </a>
            </div>
            <div className="flex-none">
              <ul className="menu menu-horizontal px-1">
                <li>
                  <a href="/prompts">Discover</a>
                </li>
                <li>
                  <a href="/reading-list">Reading List</a>
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
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
