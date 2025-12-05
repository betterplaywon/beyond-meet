# TODO - 남은 작업 및 개선사항

## 미완료 기능

### 1. 이메일 발송 (비밀번호 재설정)
- 위치: `backend/src/services/auth-service.ts`
- 현재 상태: 임시 비밀번호 생성 로직만 구현, 실제 이메일 발송 미구현
- 필요 작업: Nodemailer 또는 SendGrid 연동

### 2. 이미지 피커 (프로필 편집)
- 위치: `mobile/src/screens/profile/ProfileEditScreen.tsx`
- 현재 상태: UI 완료, 이미지 선택 기능 미구현
- 필요 작업: react-native-image-picker 연동

### 3. 설정 화면 일부 기능
- 위치: `mobile/src/screens/profile/SettingsScreen.tsx`
- 미완료 항목:
  - 비밀번호 변경 기능
  - 나이 범위 설정 모달
  - WebView 네비게이션 (개인정보처리방침, 이용약관)

### 4. 친구 직접 통화
- 위치: `mobile/src/screens/home/FriendsScreen.tsx`
- 현재 상태: UI 및 버튼 완료, `handleDirectCall` 함수 미완성
- 필요 작업: Socket.io 이벤트 연동

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
