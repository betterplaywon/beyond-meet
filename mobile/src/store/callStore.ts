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
  isJoined: boolean; // Agora 채널 참가 여부
  callDuration: number;
  showIncomingCallModal: boolean; // 전역 incoming call 모달 표시 여부

  // Actions
  setCurrentSession: (session: MatchSession | null) => void;
  setIncomingCall: (call: { session: MatchSession; caller: User } | null) => void;
  setIsInCall: (isInCall: boolean) => void;
  setIsJoined: (isJoined: boolean) => void;
  setCallDuration: (duration: number) => void;
  setShowIncomingCallModal: (show: boolean) => void;
  clearCallState: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  // Initial State
  currentSession: null,
  incomingCall: null,
  isInCall: false,
  isJoined: false,
  callDuration: 0,
  showIncomingCallModal: false,

  // Actions
  setCurrentSession: (session) => set({ currentSession: session }),

  setIncomingCall: (call) => set({ incomingCall: call }),

  setIsInCall: (isInCall) => set({ isInCall }),

  setIsJoined: (isJoined) => set({ isJoined }),

  setCallDuration: (duration) => set({ callDuration: duration }),

  setShowIncomingCallModal: (show) => set({ showIncomingCallModal: show }),

  clearCallState: () =>
    set({
      currentSession: null,
      incomingCall: null,
      isInCall: false,
      isJoined: false,
      callDuration: 0,
      showIncomingCallModal: false,
    }),
}));
