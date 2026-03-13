'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';
let convexClient: ConvexReactClient | null = null;

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'NEXT_PUBLIC_CONVEX_URL is not set. Convex features are disabled.'
      );
    }
    return <>{children}</>;
  }

  if (!convexClient) {
    convexClient = new ConvexReactClient(convexUrl);
  }

  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}
