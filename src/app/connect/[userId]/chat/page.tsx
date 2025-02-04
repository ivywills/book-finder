'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import { useParams } from 'next/navigation';

export default function ChatPage() {
  const { user } = useUser();
  const { userId } = useParams();
  const userIdString = Array.isArray(userId) ? userId[0] : userId;
  const messages = useQuery(api.messages.list, {
    userId: user?.id,
    otherUserId: userIdString,
  });
  const sendMessage = useMutation(api.messages.send);
  const [newMessageText, setNewMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sender =
        user?.primaryEmailAddress?.emailAddress.split('@')[0] || 'Anonymous';
      await sendMessage({
        body: newMessageText,
        sender,
        userId: user?.id,
        otherUserId: userIdString,
      });
      setNewMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (messages === undefined) {
    return <div>Loading...</div>;
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString();
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <main className="p-4 flex flex-col h-screen">
      <h1 className="text-2xl font-bold mb-4">Chat</h1>
      <ul className="space-y-4 flex-1 overflow-y-auto flex flex-col-reverse">
        {messages.map((message, index) => {
          const previousMessage = messages[index + 1];
          const showTimestamp =
            !previousMessage ||
            new Date(message.timestamp).getTime() -
              new Date(previousMessage.timestamp).getTime() >
              5 * 60 * 1000;

          return (
            <li
              key={message._id}
              className={`chat ${message.sender === user?.primaryEmailAddress?.emailAddress.split('@')[0] ? 'chat-end' : 'chat-start'}`}
            >
              <div
                className={`chat-bubble ${message.sender === user?.primaryEmailAddress?.emailAddress.split('@')[0] ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}
              >
                {message.body}
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center w-full">
                {message.sender}
              </div>
              {showTimestamp &&
                message.timestamp &&
                !isNaN(new Date(message.timestamp).getTime()) && (
                  <div className="text-xs text-gray-500 mt-1 text-center w-full">
                    {formatTimestamp(message.timestamp)}
                  </div>
                )}
            </li>
          );
        })}
        <div ref={messagesEndRef} />
      </ul>
      <form onSubmit={handleSendMessage} className="mt-4 flex space-x-2">
        <input
          value={newMessageText}
          onChange={(e) => setNewMessageText(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 p-2 border rounded-lg"
        />
        <button
          type="submit"
          disabled={!newMessageText}
          className="btn btn-primary"
        >
          Send
        </button>
      </form>
    </main>
  );
}
