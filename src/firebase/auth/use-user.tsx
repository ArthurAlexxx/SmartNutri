// src/firebase/auth/use-user.tsx
'use client';

import { useFirebaseContext } from '@/firebase/provider';

// Re-export the type for external use if needed
export type { UserHookResult } from '@/firebase/provider';

/**
 * A hook to access the current authenticated user's state.
 * It's a convenient wrapper around `useFirebaseContext` to destructure user-related properties.
 *
 * This hook can only be used by components wrapped in a `FirebaseProvider`.
 *
 * @returns {UserHookResult} - An object containing the user, loading state, and any authentication error.
 */
export function useUser() {
  const { user, isUserLoading, userError } = useFirebaseContext();
  return { user, isUserLoading, userError };
}
