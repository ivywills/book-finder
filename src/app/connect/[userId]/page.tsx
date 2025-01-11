'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  friends: { id: string; name: string }[];
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
      const response = await fetch('/api/user-profile', {
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
      <h2 className="text-2xl font-bold mt-6">Friends</h2>
      <ul className="list-disc pl-5">
        {userProfile.friends.map((friend) => (
          <li key={friend.id}>{friend.name}</li>
        ))}
      </ul>
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
