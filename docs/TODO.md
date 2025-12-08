# TODO - 남은 작업 및 개선사항

## 완료된 기능

### 1. 친구 직접 통화 ✅
- 위치: `mobile/src/screens/friends/FriendsScreen.tsx`, `mobile/src/services/socketService.ts`
- 완료: Socket.io 이벤트 연동, 통화 요청/수락/거절 처리

### 2. 이미지 피커 (프로필 편집) ✅
- 위치: `mobile/src/screens/profile/ProfileEditScreen.tsx`
- 완료: react-native-image-picker 연동 (갤러리만)
- iOS Info.plist에 NSPhotoLibraryUsageDescription 추가

### 3. 설정 화면 기능 ✅
- 위치: `mobile/src/screens/profile/SettingsScreen.tsx`
- 완료 항목:
  - 비밀번호 변경 기능 (`ChangePasswordScreen.tsx`)
  - 나이 범위 설정 모달
  - 개인정보처리방침/이용약관 화면 (`LegalContentScreen.tsx` - placeholder)

## 미완료 기능

### 1. 이메일 발송 (비밀번호 재설정) - 보류
- 위치: `backend/src/services/auth-service.ts`
- 현재 상태: 베타 기간 동안 토큰 직접 반환 방식 유지
- 필요 작업: Nodemailer 또는 SendGrid 연동 (정식 출시 시)
- 참고: `POST /api/auth/forgot-password` API가 resetToken을 직접 반환

### 2. 개인정보처리방침/이용약관 실제 URL
- 위치: `mobile/src/screens/profile/LegalContentScreen.tsx`
- 현재 상태: placeholder 텍스트로 표시
- 필요 작업: 정식 법률 문서 작성 후 URL 또는 내용 업데이트

## 향후 개선사항

### 성능
- 이미지 캐싱 최적화
- Socket 연결 재시도 로직 강화

### UX
- 통화 품질 표시 UI
- 오프라인 상태 처리 개선

### 보안
- Rate limiting 세분화
- 토큰 갱신 로직 검증
