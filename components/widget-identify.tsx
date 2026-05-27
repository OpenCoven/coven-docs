'use client';

import { useEffect } from 'react';

interface WidgetUser {
  id: string;
  email?: string;
  name?: string;
}

declare global {
  interface Window {
    OpenCovenFeedback?: (event: string, data?: WidgetUser) => void;
  }
}

/**
 * Calls OpenCovenFeedback("identify") once a user is known.
 * Drop this anywhere in the tree after auth resolves.
 * Safe to render for anonymous users — does nothing when user is null/undefined.
 */
export function WidgetIdentify({ user }: { user: WidgetUser | null | undefined }) {
  useEffect(() => {
    if (!user) return;
    window.OpenCovenFeedback?.('identify', {
      id: user.id,
      email: user.email,
      name: user.name,
    });
  }, [user]);

  return null;
}
