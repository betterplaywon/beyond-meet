/**
 * TypeScript 타입 정의
 */

// User Types
export interface User {
  id: string;
  email: string;
  nickname: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  country: string;
  bio: string | null;
  profilePhotos: string[];
  interests: string[];
  onlineStatus: 'ONLINE' | 'OFFLINE' | 'IN_CALL';
  // 매칭 필터
  preferredGender: 'MALE' | 'FEMALE' | 'ANYONE' | null;
  minAge: number; // 백엔드가 기본값 보장 (default: 20)
  maxAge: number; // 백엔드가 기본값 보장 (default: 50)
  preferredCountries: string[] | null;
  lastActive: string | null;
  createdAt: string;
  updatedAt: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  inviteCode: string;
  email: string;
  password: string;
  nickname: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  country: string;
  bio?: string;
  interests?: string[];
  // 매칭 필터
  preferredGender: 'MALE' | 'FEMALE' | 'ANYONE';
  minAge: number;
  maxAge: number;
  preferredCountries?: string[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Match Types
export type MatchType = 'RANDOM' | 'DIRECT';
export type MatchStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface MatchSession {
  id: string;
  userId1: string;
  userId2: string;
  channelName: string;
  status: MatchStatus;
  matchType: MatchType;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  createdAt: string;
}

// Call Types
export type CallStatus =
  | 'INITIATED'
  | 'RINGING'
  | 'ONGOING'
  | 'COMPLETED'
  | 'MISSED'
  | 'REJECTED'
  | 'FAILED';

export interface CallRecord {
  id: string;
  sessionId: string;
  callerId: string;
  receiverId: string;
  status: CallStatus;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  quality: number | null;
  createdAt: string;
}

// Friend Types
export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  friend: User;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Navigation Types
import { NavigatorScreenParams } from '@react-navigation/native';

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Matching: undefined;
  IncomingCall: { sessionId: string; caller: User };
  VideoCall: { sessionId: string; channelName: string; token: string; uid: number };
  CallEnd: { sessionId: string };
  CallHistory: undefined;
  ProfileEdit: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  RegisterStep1: undefined;
  RegisterStep2: undefined;
  RegisterStep3: undefined;
  Onboarding: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Friends: undefined;
  Profile: undefined;
};
