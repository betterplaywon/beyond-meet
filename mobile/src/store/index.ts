/**
 * zustand Stores 배럴 파일
 *
 * zustand는 클라이언트 상태 관리만 담당
 * - authStore: 인증 토큰, 로그인 상태
 * - callStore: 통화 UI 상태
 *
 * 서버 상태는 react-query hooks 사용:
 * - useMyProfile(), useUpdateProfile() → mobile/src/hooks/useProfile.ts
 * - useFriends(), useAddFriend() → mobile/src/hooks/useFriends.ts
 * - useCallHistory() → mobile/src/hooks/useCallHistory.ts
 */

export { useAuthStore } from './authStore';
export { useCallStore } from './callStore';
