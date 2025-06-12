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

interface UserSearchResult {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

const FriendsPage = () => {
  const { user } = useUser();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSearching(true);
    setShowDropdown(true);
    try {
      let users: UserSearchResult[] = [];
      if (!query || query.trim().length < 2) {
        const res = await fetch('/api/user-profile-all');
        if (res.ok) {
          const data = await res.json();
          users = data.users ?? [];
        }
      } else {
        const res = await fetch(
          `/api/clerk?search=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data = await res.json();
          users = data.users ?? [];
        }
      }
      const friendIds = new Set(friends.map((f) => f.id));
      setSearchResults(
        users.filter(
          (u: UserSearchResult) => u.id !== user?.id && !friendIds.has(u.id)
        )
      );
    } catch (err) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInputFocus = () => {
    if (!searchQuery) {
      handleSearch('');
    }
    setShowDropdown(true);
  };

  const handleAddFriendFromSearch = async (friend: UserSearchResult) => {
    if (!user) return;

    const response = await fetch('/api/clerk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'add.friend',
        data: {
          userId: user.id,
          friendId: friend.id,
          friendName: friend.firstName || '', // optional
        },
      }),
    });
    if (!response.ok) throw new Error('Failed to add friend');
    setFriends([
      ...friends,
      {
        id: friend.id,
        email: friend.email,
        name: friend.firstName,
        profileImageUrl: friend.imageUrl || defaultProfilePic.src,
      },
    ]);
    setSearchResults(searchResults.filter((u) => u.id !== friend.id));
    setShowDropdown(false);
    setSearchQuery('');
  };

  return (
    <div className="max-w-lg mx-auto p-5">
      <h1 className="font-bold mb-6 text-center text-2xl">Book Club</h1>
      <label className="block mb-4 text-lg text-primary text-center">
        Here, you can add your friends and chat about books—just like your
        monthly book club!
      </label>
      <h1 className="text-l font-bold mb-2 mt-2">Add a New Friend</h1>
      <div className="flex flex-col space-y-2 mb-6 relative">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by email or name"
            className="input input-bordered w-full"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={handleInputFocus}
            autoComplete="off"
            style={{ position: 'relative', zIndex: 20 }}
          />
          {searching && (
            <div className="text-sm text-gray-500">Searching...</div>
          )}
          {showDropdown && searchResults.length > 0 && (
            <ul
              className="absolute z-10 bg-white border border-gray-200 rounded w-full left-0 mt-1 shadow-md list-none pl-0 space-y-2"
              style={{ top: '100%', zIndex: 30 }}
            >
              {searchResults.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={user.imageUrl || defaultProfilePic.src}
                      alt={user.email ?? ''}
                      className="w-8 h-8 rounded-full"
                    />
                    <span>{user.email}</span>
                    {user.firstName && (
                      <span className="ml-2 text-gray-500">
                        {user.firstName} {user.lastName}
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-xs btn-primary"
                    onClick={() => handleAddFriendFromSearch(user)}
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <h2 className="font-bold text-lg mb-2 mt-6">Your Friends</h2>
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
    </div>
  );
};

export default FriendsPage;
