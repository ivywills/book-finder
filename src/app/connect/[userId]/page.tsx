'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  friends: { id: string; name: string }[];
}

const UserProfilePage = () => {
  const { userId } = useParams();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/user-profile?userId=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const data = await response.json();
        setUserProfile(data.userProfile);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

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
    </div>
  );
};

export default UserProfilePage;
