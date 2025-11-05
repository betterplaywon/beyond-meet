/**
 * 통화 상태 관리 Zustand Store
 */

import { create } from 'zustand';
import { MatchSession, User } from '../@types';

interface CallState {
  // State
  currentSession: MatchSession | null;
  incomingCall: {
    session: MatchSession;
    caller: User;
  } | null;
  isInCall: boolean;
  callDuration: number;

  // Actions
  setCurrentSession: (session: MatchSession | null) => void;
  setIncomingCall: (call: { session: MatchSession; caller: User } | null) => void;
  setIsInCall: (isInCall: boolean) => void;
  setCallDuration: (duration: number) => void;
  clearCallState: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  // Initial State
  currentSession: null,
  incomingCall: null,
  isInCall: false,
  callDuration: 0,

  // Actions
  setCurrentSession: (session) => set({ currentSession: session }),

  setIncomingCall: (call) => set({ incomingCall: call }),

  setIsInCall: (isInCall) => set({ isInCall }),

  setCallDuration: (duration) => set({ callDuration: duration }),

  clearCallState: () =>
    set({
      currentSession: null,
      incomingCall: null,
      isInCall: false,
      callDuration: 0,
    }),
}));
