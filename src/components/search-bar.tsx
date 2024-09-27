"use client";

import { useState } from "react";
import axios from "axios";
import Image from "next/image";
import Book from "../app/books.png";
import { FaSearch, FaHeart } from "react-icons/fa";

export default function SearchBar() {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [likedBooks, setLikedBooks] = useState<{ [key: number]: boolean }>({});

  const handleSearchClick = () => {
    setIsSearchActive(true);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  };

  const handleHeartClick = (index: number) => {
    setLikedBooks((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const fetchBooks = () => {
    if (searchInput) {
      setLoading(true);
      axios
        .get(`https://openlibrary.org/search.json?q=${searchInput}`)
        .then((response) => {
          const fetchedBooks = response.data.docs.map(
            (doc: { title: string; author_name: string[]; isbn: string[] }) => ({
              title: doc.title,
              author: doc.author_name ? doc.author_name.join(", ") : "Unknown Author",
              coverUrl: doc.isbn ? `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-S.jpg` : null,
            })
          );
          setBooks(fetchedBooks);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching books:", error);
          setLoading(false);
        });
    } else {
      setBooks([]);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      fetchBooks();
    }
  };

  const filteredBooks: {
    title: string;
    author: string;
    coverUrl: string | null;
  }[] = books.slice(0, 5); // Limit to 5 books

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 pb-20 gap-4 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-neutral-300 dark:bg-neutral-700">
      {!isSearchActive && (
        <>
          <Image src={Book} alt="Book Finder logo" width={180} height={38} priority />
          <h1 className="text-4xl font-bold">Book Finder</h1>
          <div className="text-sm">By Ivy Wills</div>
        </>
      )}
      <div
        className={`w-2/3 sm:w-1/3 transition-transform duration-1000 ease-in-out ${
          isSearchActive ? "fixed top-8" : ""
        }`}
      >
        <div className="relative">
          <input
            type="text"
            placeholder="Search for books..."
            className="w-full p-2 pl-10 border border-gray-300 rounded"
            onClick={handleSearchClick}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            value={searchInput}
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
        </div>
      </div>
      {loading ? (
        <div className="p-2 text-gray-500">Loading...</div>
      ) : filteredBooks.length > 0 ? (
        <div className="flex flex-wrap justify-center mt-4">
          {filteredBooks.map((book, index) => (
            <div key={index} className="p-2 m-2 border border-gray-300 rounded flex flex-col items-center">
              {book.coverUrl && (
                <img
                  src={book.coverUrl}
                  alt={`${book.title} cover`}
                  className="w-24 h-32 mb-2"
                />
              )}
              <div className="text-center">
                <strong>{book.title}</strong>
                <div className="text-sm text-gray-500">{book.author}</div>
              </div>
              <FaHeart
                className={`cursor-pointer mt-2 ${
                  likedBooks[index] ? "text-pink-500" : "text-gray-400"
                }`}
                onClick={() => handleHeartClick(index)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-2 text-gray-500">No books found</div>
      )}
    </div>
  );
}