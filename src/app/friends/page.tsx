'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import defaultProfilePic from './profile-pic.png';

interface Friend {
  id: string;
  name?: string;
  email?: string;
  profileImageUrl?: string; // Add profile image URL
}

const FriendsPage = () => {
  const { user } = useUser();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState('');

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/clerk?userId=${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch friends');
        }
        const data = await response.json();
        console.log('Fetched Friends Data:', data);
        const friendsData = data.userProfile.friends ?? [];

        // Fetch profile images for each friend
        const friendsWithImages = await Promise.all(
          friendsData.map(async (friend: Friend) => {
            const profileResponse = await fetch(
              `/api/clerk?userId=${friend.id}`
            );
            if (!profileResponse.ok) {
              throw new Error('Failed to fetch friend profile');
            }
            const profileData = await profileResponse.json();
            const friendWithImage = {
              id: profileData.id,
              name: profileData.fullName,
              email: profileData.primaryEmailAddress?.emailAddress,
              profileImageUrl: profileData.imageUrl || defaultProfilePic.src, // Use base64 imageUrl or default
            };
            console.log('Friend Data:', friendWithImage);
            return friendWithImage;
          })
        );

        setFriends(friendsWithImages);
      } catch (err) {
        console.error('Error fetching friends:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  const handleGetShareLink = () => {
    if (user) {
      const link = `${window.location.origin}/connect/${user.id}`;
      setShareLink(link);
      navigator.clipboard.writeText(link).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000); // Reset the copied state after 2 seconds
      });
    }
  };

  const handleAddFriend = async (friendEmail: string) => {
    if (!user) return;

    try {
      // Fetch the user ID associated with the email
      const userIdResponse = await fetch(`/api/clerk?email=${friendEmail}`);
      if (!userIdResponse.ok) {
        throw new Error('Failed to fetch user ID');
      }
      const { userId: friendId } = await userIdResponse.json();

      // Fetch the friend's profile image
      const profileResponse = await fetch(`/api/clerk?userId=${friendId}`);
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch friend profile');
      }
      const profileData = await profileResponse.json();
      const profileImageUrl = profileData.imageUrl || defaultProfilePic.src;
      console.log('Friend Data:', profileData);

      // Add the friend using the fetched user ID
      const response = await fetch('/api/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'add.friend',
          data: {
            userId: user.id,
            friendId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add friend');
      }

      setFriends([
        ...friends,
        { id: friendId, email: friendEmail, profileImageUrl },
      ]);
      setNewFriendEmail('');
    } catch (err) {
      console.error('Error adding friend:', err);
      setError((err as Error).message);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;

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
            friendId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove friend');
      }

      setFriends(friends.filter((friend) => friend.id !== friendId));
    } catch (err) {
      console.error('Error removing friend:', err);
      setError((err as Error).message);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-5">
      <div className="mt-6">
        <h2 className="font-bold my-6 text-xl">Add a New Friend</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Friend Email"
            className="input input-bordered w-full"
            value={newFriendEmail}
            onChange={(e) => setNewFriendEmail(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={() => handleAddFriend(newFriendEmail)}
          >
            Add Friend
          </button>
        </div>
      </div>
      <h1 className="font-bold my-6 text-xl">Friends</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {error && <div className="text-red-500">{error}</div>}
          {(friends ?? []).length === 0 ? (
            <div>No friends added yet.</div>
          ) : (
            <ul className="list-disc pl-5">
              {friends.map((friend) => (
                <li
                  key={friend.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <img
                      src={friend.profileImageUrl || defaultProfilePic.src}
                      alt={`${friend.name ?? friend.email}'s profile`}
                      className="w-10 h-10 rounded-full mr-2"
                    />
                    <div>
                      <Link href={`/connect/${friend.id}`} legacyBehavior>
                        <a className="text-blue-500">
                          {friend.name &&
                          friend.name !== 'null null' &&
                          friend.name.length > 1
                            ? friend.name
                            : (friend.email?.split('@')[0] ?? '')}
                        </a>
                      </Link>
                      {friend.email && (
                        <span className="flex items-center">
                          <p>Email: {friend.email}</p>
                          <button
                            className="btn btn-xs btn-link ml-2"
                            onClick={() => handleRemoveFriend(friend.id)}
                          >
                            Remove
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/connect/${friend.id}/chat`} legacyBehavior>
                    <a className="btn btn-sm btn-primary">Chat</a>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <h2 className="font-bold my-4 text-xl">Share your account</h2>
      <button className="btn btn-primary mt-4" onClick={handleGetShareLink}>
        Friend Link
      </button>

      {shareLink && (
        <div className="mt-4">
          <p>Share this link with your friends:</p>
          <a href={shareLink} className="text-blue-500">
            {shareLink}
          </a>
          {linkCopied && (
            <p className="text-green-500">Link copied to clipboard!</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FriendsPage;
