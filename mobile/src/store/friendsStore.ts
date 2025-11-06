/**
 * 친구 목록 관련 Zustand Store
 */

import { create } from 'zustand';
import { Friendship, User } from '../@types';

interface FriendsState {
  // State
  friends: Friendship[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setFriends: (friends: Friendship[]) => void;
  addFriend: (friendship: Friendship) => void;
  removeFriend: (friendshipId: string) => void;
  updateFriendStatus: (userId: string, status: User['onlineStatus']) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearFriends: () => void;

  // Getters
  getFriendById: (friendId: string) => Friendship | undefined;
  getOnlineFriends: () => Friendship[];
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  // Initial State
  friends: [],
  isLoading: false,
  error: null,

  // Actions
  setFriends: (friends) =>
    set({
      friends,
      isLoading: false,
      error: null,
    }),

  addFriend: (friendship) =>
    set((state) => ({
      friends: [...state.friends, friendship],
    })),

  removeFriend: (friendshipId) =>
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== friendshipId),
    })),

  updateFriendStatus: (userId, status) =>
    set((state) => ({
      friends: state.friends.map((friendship) =>
        friendship.friend.id === userId
          ? {
              ...friendship,
              friend: {
                ...friendship.friend,
                onlineStatus: status,
              },
            }
          : friendship
      ),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearFriends: () =>
    set({
      friends: [],
      isLoading: false,
      error: null,
    }),

  // Getters
  getFriendById: (friendId) => {
    return get().friends.find((f) => f.friend.id === friendId);
  },

  getOnlineFriends: () => {
    return get().friends.filter(
      (f) => f.friend.onlineStatus === 'ONLINE'
    );
  },
}));
