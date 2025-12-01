/**
 * https://tanstack.com/query/latest/docs/react/guides/query-keys
 */

export const queryKeys = {
  // Profile related queries
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
    detail: (userId: string) =>
      [...queryKeys.profile.all, 'detail', userId] as const,
  },

  // Friends related queries
  friends: {
    all: ['friends'] as const,
    list: (userId: string) =>
      [...queryKeys.friends.all, 'list', userId] as const,
  },

  // Call history related queries
  call: {
    all: ['call'] as const,
    history: (userId: string, page?: number) =>
      [...queryKeys.call.all, 'history', userId, page] as const,
    session: (sessionId: string) =>
      [...queryKeys.call.all, 'session', sessionId] as const,
  },
} as const;

// Type exports for convenience
export type ProfileQueryKeys = typeof queryKeys.profile;
export type FriendsQueryKeys = typeof queryKeys.friends;
export type CallQueryKeys = typeof queryKeys.call;
