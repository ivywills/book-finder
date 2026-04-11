'use client';

import { useEffect } from 'react';
import { HomeIcon, UserCircleIcon } from '@heroicons/react/outline';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';
import ThemeToggle from './theme-toggle';

function SignedOutLightMode() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return null;
}

export default function AuthNav() {
  const desktopNavButtonClassName =
    'inline-flex h-10 w-[6.75rem] items-center justify-center gap-2 rounded-full border border-base-300/70 bg-base-100/90 px-4 text-sm font-medium transition hover:border-primary/30 hover:bg-base-100';
  const mobileNavButtonClassName =
    'inline-flex h-10 w-full items-center gap-2 rounded-full px-3 text-sm font-medium';

  return (
    <>
      <SignedIn>
        <div className="navbar bg-base-100 shadow-md sticky top-0 mb-4 z-50">
          <div className="flex-1 flex items-center">
            <div className="absolute top-5 left-4">
              <UserButton />
            </div>
          </div>
          <div className="flex-none">
            <div className="hidden items-center gap-2 md:flex">
              <div>
                <a href="/" className={desktopNavButtonClassName}>
                  <HomeIcon className="h-4 w-4 shrink-0" />
                  <span>Home</span>
                </a>
              </div>
              <div>
                <a
                  href="/reading-list"
                  className={desktopNavButtonClassName}
                >
                  <UserCircleIcon className="h-4 w-4 shrink-0" />
                  <span>Profile</span>
                </a>
              </div>
              <div>
                <ThemeToggle buttonClassName={desktopNavButtonClassName} />
              </div>
            </div>

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
                  <a href="/" className={mobileNavButtonClassName}>
                    <HomeIcon className="h-4 w-4 shrink-0" />
                    <span>Home</span>
                  </a>
                </li>
                <li>
                  <a
                    href="/reading-list"
                    className={mobileNavButtonClassName}
                  >
                    <UserCircleIcon className="h-4 w-4 shrink-0" />
                    <span>Profile</span>
                  </a>
                </li>
                <li>
                  <ThemeToggle
                    buttonClassName={mobileNavButtonClassName}
                    menuClassName="right-auto left-0"
                  />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </SignedIn>

      <SignedOut>
        <SignedOutLightMode />
        <div className="navbar bg-base-100 shadow-md sticky top-0 mb-4 z-50">
          <div className="absolute top-5 left-4 h-5 flex items-center">
            <SignInButton>
              <div className="btn btn-primary btn-xs mx-1 min-h-0 h-8 px-3 text-sm">
                Sign in
              </div>
            </SignInButton>
            <SignUpButton>
              <div className="btn btn-secondary btn-xs mx-1 min-h-0 h-8 px-3 text-sm">
                Sign up
              </div>
            </SignUpButton>
          </div>
        </div>
      </SignedOut>
    </>
  );
}
