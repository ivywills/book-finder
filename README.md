# Book Finder

Book Finder is a full-stack web application that helps users discover, save, and share their favorite books. Users can enter a prompt to generate book suggestions using AI, view detailed book information, add books to their favorites, and connect with friends to chat about books.

## Features

- **AI Book Discovery:** Enter a prompt describing the kind of book you want to read, and Book Finder will suggest relevant books using OpenAI and Google Books APIs.
- **Favorites:** Save your favorite books for quick access and view them in a carousel or list view.
- **Friend System:** Search for users by email or name, add them as friends, and chat about books.
- **Profile Management:** User profiles are synced with Clerk authentication and MongoDB, including profile images and emails.
- **Responsive UI:** Optimized for both desktop and mobile devices, with support for dark and light themes.
- **Book Details:** View book covers, authors, ratings, and more, with links to external sources for further exploration.

## Tech Stack

- **Frontend:** Next.js (React), TypeScript, Tailwind CSS, FontAwesome, Clerk for authentication
- **Backend:** Next.js API routes, MongoDB (via the official Node.js driver)
- **AI Integration:** OpenAI API for prompt-based book suggestions
- **Book Data:** Google Books API and Open Library API for book metadata and covers
- **Authentication:** Clerk (with social login support)
- **Deployment:** Vercel (or any Node.js-compatible hosting)

## Getting Started

To get started with the Book Finder app, follow these steps:

### Prerequisites

Make sure you have the following installed on your machine:

- Node.js
- npm (Node Package Manager) or yarn or pnpm or bun

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/book-finder.git
   cd book-finder
   ```

2. Install the dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

### Running the App

To run the app in development mode, use the following command:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
