'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import defaultProfilePic from './profile-pic.png';

interface Friend {
  id: string;
  name?: string;
  email?: string;
  profileImageUrl?: string;
}

const FriendsPage = () => {
  const { user } = useUser();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState('');

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;

      setLoading(true);

      try {
        const response = await fetch(`/api/clerk?userId=${user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch friends');
        }
        const data = await response.json();
        const friendsData = data.userProfile.friends ?? [];

        const friendsWithImages = friendsData.map((friend: Friend) => ({
          ...friend,
          name: friend.name || friend.email,
          email: friend.email || '',
          profileImageUrl: friend.profileImageUrl || defaultProfilePic.src,
        }));

        setFriends(friendsWithImages);
      } catch (err) {
        console.error('Error fetching friends:', err);
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
      navigator
        .share({
          title: 'Share my account',
          text: 'Check out my profile on Book Finder!',
          url: link,
        })
        .then(() => {
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
        })
        .catch((error) => {
          console.error('Error sharing:', error);
        });
    }
  };

  const handleAddFriend = async (friendEmail: string) => {
    if (!user) return;

    try {
      const userIdResponse = await fetch(`/api/clerk?email=${friendEmail}`);
      if (!userIdResponse.ok) {
        throw new Error('Failed to fetch user ID');
      }
      const { userId: friendId } = await userIdResponse.json();

      const profileResponse = await fetch(`/api/clerk?userId=${friendId}`);
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch friend profile');
      }
      const profileData = await profileResponse.json();
      const profileImageUrl = profileData.imageUrl || defaultProfilePic.src;

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
    }
  };

  return (
    <div className="max-w-lg mx-auto p-5">
      <h1 className="font-bold mb-6 text-center text-2xl">Book Club</h1>
      <label className="block mb-4 text-lg text-primary text-center">
        Here, you can add your friends and chat about books—just like your
        monthly book club!
      </label>
      {loading ? (
        <div></div>
      ) : (
        <>
          {(friends ?? []).length !== 0 && (
            <>
              <ul className="list-none pl-0 space-y-4">
                {friends.map((friend, index) => (
                  <li
                    key={friend.id}
                    className={`flex items-center justify-between pb-4 ${index !== friends.length - 1 ? 'border-b border-gray-200' : ''}`}
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={friend.profileImageUrl || defaultProfilePic.src}
                        alt={`${friend.name ?? friend.email}'s profile`}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <Link href={`/connect/${friend.id}`} legacyBehavior>
                          <a className="text-blue-500">{friend.email}</a>
                        </Link>
                      </div>
                    </div>
                    <Link href={`/connect/${friend.id}/chat`} legacyBehavior>
                      <a className="btn btn-sm btn-primary">Chat</a>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <h1 className="text-l font-bold mb-6 mt-2">Add a New Friend</h1>
      <div className="flex space-x-2 mb-6">
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

      <h1 className="text-sm font-bold mt-2">
        Share this link with your friends to let them see your profile:
      </h1>
      <button className="btn btn-primary mt-4" onClick={handleGetShareLink}>
        Share my account
      </button>
    </div>
  );
};

export default FriendsPage;
