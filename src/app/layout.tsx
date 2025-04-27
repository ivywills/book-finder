import type { Metadata } from 'next';
import localFont from 'next/font/local';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
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
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5157675419011624"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>
          <ConvexClientProvider>
            <SignedIn>
              <div className="navbar bg-base-100">
                <div className="flex-1 flex items-center">
                  <a href="/" className="md:block hidden text-xl">
                    Book Finder
                  </a>
                </div>
                <div className="flex-none">
                  <ul className="menu menu-horizontal px-[0.25rem]">
                    <li className="md:hidden block">
                      <a href="/">Home</a>
                    </li>
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
            </SignedIn>
            <SignedOut>
              <div className="flex justify-end p-4">
                <SignInButton />
              </div>
            </SignedOut>
            {children}
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
