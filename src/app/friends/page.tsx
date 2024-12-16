'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

interface Friend {
  id: string;
  name: string;
}

const FriendsPage = () => {
  const { user } = useUser();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/user-profile?userId=${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch friends');
        }
        const data = await response.json();
        setFriends(data.friends ?? []);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddFriend = async (friendId: string, friendName: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'add.friend',
          data: {
            userId: user.id,
            friendId,
            friendName,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add friend');
      }

      setFriends([...friends, { id: friendId, name: friendName }]);
    } catch (err) {
      console.error('Error adding friend:', err);
      setError((err as Error).message);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/user-profile', {
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
      <h1 className="text-3xl font-bold mb-6 text-center">Friends</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500 mt-4">{error}</div>}
      {(friends ?? []).length === 0 ? (
        <div>No friends added yet.</div>
      ) : (
        <ul className="list-disc pl-5">
          {friends.map((friend) => (
            <li key={friend.id}>
              {friend.name}
              <button
                className="btn btn-sm btn-danger ml-2"
                onClick={() => handleRemoveFriend(friend.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn btn-primary mt-4" onClick={handleGetShareLink}>
        Get Share Link
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
