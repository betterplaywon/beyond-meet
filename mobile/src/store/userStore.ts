/**
 * 사용자 프로필 관련 Zustand Store
 */

import { create } from 'zustand';
import { User } from '../@types';

interface UserState {
  // State
  users: Map<string, User>; // userId -> User 맵
  currentViewingUserId: string | null;

  // Actions
  addUser: (user: User) => void;
  addUsers: (users: User[]) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  removeUser: (userId: string) => void;
  getUser: (userId: string) => User | undefined;
  setCurrentViewingUser: (userId: string | null) => void;
  clearUsers: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  // Initial State
  users: new Map(),
  currentViewingUserId: null,

  // Actions
  addUser: (user) =>
    set((state) => {
      const newUsers = new Map(state.users);
      newUsers.set(user.id, user);
      return { users: newUsers };
    }),

  addUsers: (users) =>
    set((state) => {
      const newUsers = new Map(state.users);
      users.forEach((user) => {
        newUsers.set(user.id, user);
      });
      return { users: newUsers };
    }),

  updateUser: (userId, updates) =>
    set((state) => {
      const newUsers = new Map(state.users);
      const existingUser = newUsers.get(userId);
      if (existingUser) {
        newUsers.set(userId, { ...existingUser, ...updates });
      }
      return { users: newUsers };
    }),

  removeUser: (userId) =>
    set((state) => {
      const newUsers = new Map(state.users);
      newUsers.delete(userId);
      return { users: newUsers };
    }),

  getUser: (userId) => {
    return get().users.get(userId);
  },

  setCurrentViewingUser: (userId) =>
    set({ currentViewingUserId: userId }),

  clearUsers: () =>
    set({
      users: new Map(),
      currentViewingUserId: null,
    }),
}));
