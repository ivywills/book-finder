'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';

interface Book {
  title: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  imageLinks?: {
    thumbnail?: string;
  };
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  friends: { id: string; name: string }[];
  currentlyReading?: {
    book: Book;
    progress: number;
  };
  completedBooks?: Book[];
}

const UserProfilePage = () => {
  const { userId } = useParams();
  const { user } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/clerk?userId=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const data = await response.json();
        setUserProfile(data.userProfile);
        if (
          user &&
          data.userProfile.friends.some(
            (friend: { id: string }) => friend.id === user.id
          )
        ) {
          setIsFriend(true);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, user]);

  const handleAddFriend = async () => {
    if (!user || !userProfile) return;

    try {
      const response = await fetch('/api/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'add.friend',
          data: {
            userId: user.id,
            friendId: userProfile.id,
            friendName: `${userProfile.firstName} ${userProfile.lastName}`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add friend');
      }

      setIsFriend(true);
    } catch (err) {
      console.error('Error adding friend:', err);
      setError((err as Error).message);
    }
  };

  const handleRemoveFriend = async () => {
    if (!user || !userProfile) return;

    try {
      const response = await fetch('/api/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'remove.friend',
          data: {
            userId: user.id,
            friendId: userProfile.id,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove friend');
      }

      setIsFriend(false);
    } catch (err) {
      console.error('Error removing friend:', err);
      setError((err as Error).message);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 mt-4">{error}</div>;
  }

  if (!userProfile) {
    return null;
  }

  return (
    <div className="max-w-lg mx-auto p-5">
      <h1 className="text-3xl font-bold mb-6 text-center">
        {userProfile.firstName} {userProfile.lastName}
      </h1>
      <p>Email: {userProfile.email}</p>
      <ul className="list-disc pl-5">
        {userProfile.friends.map((friend) => (
          <li key={friend.id}>{friend.name}</li>
        ))}
      </ul>
      <h2 className="text-2xl font-bold mt-6">Currently Reading</h2>
      {userProfile.currentlyReading ? (
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-xl font-bold mb-2">
            {userProfile.currentlyReading.book.title}
          </h3>
          {userProfile.currentlyReading.book.imageLinks &&
            userProfile.currentlyReading.book.imageLinks.thumbnail && (
              <Image
                src={userProfile.currentlyReading.book.imageLinks.thumbnail}
                alt={`${userProfile.currentlyReading.book.title} cover`}
                width={96}
                height={144}
                className="object-cover mb-2"
              />
            )}
          <p>
            <strong>Author:</strong>{' '}
            {userProfile.currentlyReading.book.authors
              ? userProfile.currentlyReading.book.authors.join(', ')
              : 'Unknown Author'}
          </p>
          <p>
            <strong>Publisher:</strong>{' '}
            {userProfile.currentlyReading.book.publisher || 'Unknown Publisher'}
          </p>
          <p>
            <strong>Published Date:</strong>{' '}
            {userProfile.currentlyReading.book.publishedDate || 'Unknown Date'}
          </p>
          <p>
            <strong>Number of Pages:</strong>{' '}
            {userProfile.currentlyReading.book.pageCount || 'Unknown'}
          </p>
          <p>
            <strong>Progress:</strong> {userProfile.currentlyReading.progress}{' '}
            pages read
          </p>
        </div>
      ) : (
        <div>No book is currently being read.</div>
      )}
      <h2 className="text-2xl font-bold mt-6">Completed Books</h2>
      {userProfile.completedBooks && userProfile.completedBooks.length > 0 ? (
        <ul className="list-disc pl-5">
          {userProfile.completedBooks.map((book, index) => (
            <li key={index} className="mb-4">
              <h3 className="text-xl font-bold">{book.title}</h3>
              {book.imageLinks && book.imageLinks.thumbnail && (
                <Image
                  src={book.imageLinks.thumbnail}
                  alt={`${book.title} cover`}
                  width={96}
                  height={144}
                  className="object-cover mb-2"
                />
              )}
              <p>
                <strong>Author:</strong>{' '}
                {book.authors ? book.authors.join(', ') : 'Unknown Author'}
              </p>
              <p>
                <strong>Publisher:</strong>{' '}
                {book.publisher || 'Unknown Publisher'}
              </p>
              <p>
                <strong>Published Date:</strong>{' '}
                {book.publishedDate || 'Unknown Date'}
              </p>
              <p>
                <strong>Number of Pages:</strong> {book.pageCount || 'Unknown'}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div>No completed books yet.</div>
      )}
      {user && user.id !== userProfile.id && (
        <div className="mt-6">
          {isFriend ? (
            <button className="btn btn-danger" onClick={handleRemoveFriend}>
              Remove Friend
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleAddFriend}>
              Add Friend
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;
