# API 명세서

- **Base URL**: `https://your-app.onrender.com/api`
- **인증**: JWT Bearer Token (`Authorization: Bearer {accessToken}`)

---

## 엔드포인트 목록

### Auth
| Method | Endpoint | 설명 | Access |
|--------|----------|------|--------|
| POST | `/auth/register` | 회원가입 (초대 코드 필수) | Public |
| POST | `/auth/login` | 로그인 | Public |
| POST | `/auth/refresh` | 토큰 갱신 | Public |
| POST | `/auth/logout` | 로그아웃 | Private |
| GET | `/auth/me` | 현재 사용자 정보 조회 | Private |
| POST | `/auth/forgot-password` | 비밀번호 재설정 요청 | Public |
| POST | `/auth/reset-password` | 비밀번호 재설정 | Public |
| POST | `/auth/change-password` | 비밀번호 변경 (로그인 상태) | Private |
| DELETE | `/auth/account` | 회원 탈퇴 | Private |
| POST | `/auth/send-verification-code` | 회원가입 전 이메일 인증 코드 발송 | Public |
| POST | `/auth/verify-code` | 회원가입 전 인증 코드 확인 | Public |
| POST | `/auth/verify-email` | 이메일 인증 (로그인 상태) | Private |
| POST | `/auth/resend-verification` | 인증 코드 재발송 | Private |

### Users
| Method | Endpoint | 설명 | Access |
|--------|----------|------|--------|
| GET | `/users/me` | 내 프로필 조회 | Private |
| GET | `/users/:userId` | 사용자 프로필 조회 | Private |
| PUT | `/users/:userId` | 프로필 수정 | Private |
| POST | `/users/me/photos` | 프로필 사진 업로드 | Private |
| DELETE | `/users/me/photos/:photoUrl` | 프로필 사진 삭제 | Private |
| GET | `/users/me/stats` | 내 통계 조회 | Private |

### Friends
| Method | Endpoint | 설명 | Access |
|--------|----------|------|--------|
| GET | `/friends` | 친구 목록 조회 | Private |
| POST | `/friends/:friendId` | 친구 추가 | Private |
| DELETE | `/friends/:friendId` | 친구 삭제 | Private |
| GET | `/friends/blocked` | 차단 목록 조회 | Private |
| POST | `/friends/block/:blockedUserId` | 사용자 차단 | Private |
| DELETE | `/friends/block/:blockedUserId` | 차단 해제 | Private |

### Match (Socket.io)
| Event | 방향 | 설명 |
|-------|------|------|
| `match:request` | C → S | 랜덤/직접 매칭 요청 |
| `match:cancel` | C → S | 매칭 취소 |
| `match:waiting` | S → C | 대기 중 |
| `match:found` | S → C | 매칭 성공 |
| `match:failed` | S → C | 매칭 실패 |

### Call
| Method | Endpoint | 설명 | Access |
|--------|----------|------|--------|
| POST | `/call/start` | 통화 시작 | Private |
| POST | `/call/:callId/end` | 통화 종료 | Private |
| GET | `/call/history` | 통화 기록 조회 | Private |
| GET | `/call/session/:sessionId` | 세션 정보 조회 | Private |
| POST | `/call/:callId/event` | 통화 이벤트 기록 | Private |

### Agora
| Method | Endpoint | 설명 | Access |
|--------|----------|------|--------|
| POST | `/agora/token` | RTC 토큰 생성 | Private |

### Push
| Method | Endpoint | 설명 | Access |
|--------|----------|------|--------|
| POST | `/push/register-device` | 디바이스 토큰 등록 | Private |
| DELETE | `/push/unregister-device` | 디바이스 토큰 제거 | Private |

### Admin
| Method | Endpoint | 설명 | Access |
|--------|----------|------|--------|
| POST | `/admin/invite-codes` | 초대 코드 생성 | Admin |
| GET | `/admin/invite-codes` | 초대 코드 목록 | Admin |
| PATCH | `/admin/invite-codes/:codeId/deactivate` | 초대 코드 비활성화 | Admin |
| GET | `/admin/stats` | 사용자 통계 | Admin |
| GET | `/admin/moderation-logs` | 모더레이션 로그 | Admin |
| GET | `/admin/reports` | 신고 목록 | Admin |

### Moderation
| Method | Endpoint | 설명 | Access |
|--------|----------|------|--------|
| POST | `/moderation/analyze` | 콘텐츠 분석 | Private |
| POST | `/moderation/report` | 사용자 신고 | Private |

---

## 주요 API 상세

### 회원가입
`POST /api/auth/register`

```json
// Request
{
  "inviteCode": "BETA2025ABC",
  "email": "user@example.com",
  "password": "Password123!",
  "nickname": "홍길동",
  "birthDate": "1995-03-15",
  "gender": "MALE",
  "country": "KR",
  "preferredGender": "FEMALE",
  "minAge": 20,
  "maxAge": 30
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "nickname": "홍길동",
      "gender": "MALE",
      "country": "KR",
      "profilePhotos": [],
      "onlineStatus": "ONLINE"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### 로그인
`POST /api/auth/login`

```json
// Request
{ "email": "user@example.com", "password": "Password123!" }

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "nickname": "홍길동",
      "email": "user@example.com",
      "onlineStatus": "ONLINE",
      "role": "USER"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### 현재 사용자 정보 조회
`GET /api/auth/me`

```json
// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "홍길동",
    "gender": "MALE",
    "country": "KR",
    "profilePhotos": ["https://..."],
    "onlineStatus": "ONLINE",
    "role": "USER"
  }
}
```

### 비밀번호 재설정 요청
`POST /api/auth/forgot-password`

```json
// Request
{ "email": "user@example.com" }

// Response
{
  "success": true,
  "data": { "message": "비밀번호 재설정 링크가 이메일로 전송되었습니다." }
}
```

### 비밀번호 재설정
`POST /api/auth/reset-password`

```json
// Request
{
  "token": "reset-token-from-email",
  "newPassword": "NewPassword123!"
}

// Response
{
  "success": true,
  "data": { "message": "비밀번호가 성공적으로 변경되었습니다." }
}
```

### 비밀번호 변경
`POST /api/auth/change-password`

```json
// Request
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}

// Response
{
  "success": true,
  "data": { "message": "비밀번호가 성공적으로 변경되었습니다." }
}
```

### 회원 탈퇴
`DELETE /api/auth/account`

```json
// Request
{ "password": "Password123!" }

// Response
{
  "success": true,
  "data": { "message": "계정이 삭제되었습니다." }
}
```

### 회원가입 전 이메일 인증 코드 발송
`POST /api/auth/send-verification-code`

```json
// Request
{ "email": "user@example.com" }

// Response
{
  "success": true,
  "data": { "message": "인증 코드가 이메일로 전송되었습니다." }
}
```

### 회원가입 전 인증 코드 확인
`POST /api/auth/verify-code`

```json
// Request
{ "email": "user@example.com", "code": "123456" }

// Response
{
  "success": true,
  "data": { "message": "이메일이 인증되었습니다." }
}
```

### 이메일 인증 (로그인 상태)
`POST /api/auth/verify-email`

```json
// Request
{ "code": "123456" }

// Response
{
  "success": true,
  "data": { "message": "이메일이 인증되었습니다." }
}
```

### 인증 코드 재발송
`POST /api/auth/resend-verification`

```json
// Response
{
  "success": true,
  "data": { "message": "인증 코드가 재발송되었습니다." }
}
```

### 프로필 사진 업로드
`POST /api/users/me/photos`

```
// Request (multipart/form-data)
photo: [파일]

// Response
{
  "success": true,
  "data": {
    "photoUrl": "https://supabase.storage/profile-photos/uuid.jpg"
  }
}
```

### 프로필 사진 삭제
`DELETE /api/users/me/photos/:photoUrl`

```json
// photoUrl은 URL 인코딩 필요

// Response
{
  "success": true,
  "data": { "message": "사진이 삭제되었습니다." }
}
```

### 사용자 통계 조회
`GET /api/users/me/stats`

```json
// Response
{
  "success": true,
  "data": {
    "totalCalls": 25,
    "totalFriends": 10,
    "totalDuration": 3600
  }
}
```

### 친구 목록 조회
`GET /api/friends`

```json
// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "friendId": "friend-uuid",
      "friend": {
        "id": "friend-uuid",
        "nickname": "친구1",
        "profilePhotos": ["https://..."],
        "onlineStatus": "ONLINE"
      },
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### 친구 추가
`POST /api/friends/:friendId`

```json
// Response
{
  "success": true,
  "data": {
    "id": "friendship-uuid",
    "userId": "my-uuid",
    "friendId": "friend-uuid",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### 친구 삭제
`DELETE /api/friends/:friendId`

```json
// Response
{
  "success": true,
  "data": { "message": "친구가 삭제되었습니다." }
}
```

### 차단 목록 조회
`GET /api/friends/blocked`

```json
// Response
{
  "success": true,
  "data": [
    {
      "id": "block-uuid",
      "blockedUserId": "blocked-user-uuid",
      "blockedUser": {
        "id": "blocked-user-uuid",
        "nickname": "차단된사용자"
      },
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### 사용자 차단
`POST /api/friends/block/:blockedUserId`

```json
// Response
{
  "success": true,
  "data": {
    "id": "block-uuid",
    "blockerId": "my-uuid",
    "blockedUserId": "blocked-user-uuid"
  }
}
```

### 차단 해제
`DELETE /api/friends/block/:blockedUserId`

```json
// Response
{
  "success": true,
  "data": { "message": "차단이 해제되었습니다." }
}
```

### 세션 정보 조회
`GET /api/call/session/:sessionId`

```json
// Response
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "channelName": "channel_abc123",
    "status": "ENDED",
    "startedAt": "2025-01-01T12:00:00Z",
    "endedAt": "2025-01-01T12:05:00Z",
    "partner": {
      "id": "partner-uuid",
      "nickname": "상대방",
      "profilePhotos": ["https://..."]
    }
  }
}
```

### 통화 이벤트 기록
`POST /api/call/:callId/event`

```json
// Request
{
  "eventType": "JOINED",
  "metadata": {}
}

// Response
{
  "success": true,
  "data": { "message": "이벤트가 기록되었습니다." }
}
```

### 초대 코드 비활성화
`PATCH /api/admin/invite-codes/:codeId/deactivate`

```json
// Response
{
  "success": true,
  "data": {
    "id": "code-uuid",
    "code": "BETA-0001",
    "isActive": false
  }
}
```

### Agora 토큰 생성
`POST /api/agora/token`

```json
// Request
{ "channelName": "channel_abc123", "uid": 0 }

// Response
{
  "success": true,
  "data": {
    "token": "006abc...",
    "channelName": "channel_abc123",
    "expiresAt": "2025-11-04T14:05:00Z"
  }
}
```

---

## Socket.io 이벤트

### 연결
```javascript
socket.connect({ auth: { token: 'jwt_access_token' } });
```

### 매칭
```javascript
// 랜덤 매칭 요청
socket.emit('match:request', {
  type: 'RANDOM',
  filters: {
    preferredGender: 'FEMALE',
    minAge: 20,
    maxAge: 30
  }
});

// 직접 통화 요청 (친구에게)
socket.emit('match:request', {
  type: 'DIRECT',
  targetUserId: 'friend-uuid'
});

// 매칭 성공
socket.on('match:found', (data) => {
  // {
  //   session: { id: 'session-uuid', channelName: 'channel_abc123' },
  //   partner: { id, nickname, profilePhotos, age, country },
  //   token: 'agora-rtc-token',
  //   uid: 12345
  // }
});

// 매칭 대기
socket.on('match:waiting', () => {
  // 매칭 대기 중
});

// 매칭 실패
socket.on('match:failed', (data) => {
  // { reason: 'NO_MATCH_FOUND' }
});
```

### 통화
```javascript
// 통화 수신
socket.on('call:incoming', (data) => {
  // {
  //   session: { id: 'session-uuid', channelName: 'channel_abc123' },
  //   caller: { id, nickname, profilePhotos }
  // }
});

// 통화 수락
socket.emit('call:accept', { sessionId: 'session-uuid' });

// 통화 수락됨 (수신)
socket.on('call:accepted', (data) => {
  // {
  //   session: { id: 'session-uuid', channelName: 'channel_abc123' },
  //   token: 'agora-rtc-token',
  //   uid: 12345
  // }
});

// 통화 거절
socket.emit('call:reject', { sessionId: 'session-uuid' });

// 통화 거절됨 (수신)
socket.on('call:rejected', (data) => {
  // { sessionId: 'session-uuid' }
});

// 통화 종료
socket.emit('call:end', { sessionId: 'session-uuid' });

// 통화 종료됨 (수신)
socket.on('call:ended', (data) => {
  // { sessionId: 'session-uuid', duration: 300 }
});

// 친구 상태 변경
socket.on('friend:status-changed', (data) => {
  // { friendId: 'uuid', status: 'ONLINE' | 'OFFLINE', lastActive: 'ISO timestamp' }
});
```

### 모더레이션
```javascript
// 경고 발송
socket.emit('moderation:warning', { sessionId: 'session-uuid', targetUserId: 'user-uuid' });

// 경고 수신
socket.on('moderation:warning-received', (data) => {
  // { sessionId, reason, warningCount }
});

// 강제 종료 요청
socket.emit('moderation:force-end', { sessionId: 'session-uuid', reportedUserId: 'user-uuid' });

// 강제 종료 수신
socket.on('moderation:call-force-ended', (data) => {
  // { sessionId, reason }
});
```

---

## 에러 코드

| 코드 | HTTP | 설명 |
|------|------|------|
| `VALIDATION_ERROR` | 400 | 입력 검증 실패 |
| `EMAIL_ALREADY_EXISTS` | 409 | 이메일 중복 |
| `INVALID_CREDENTIALS` | 401 | 로그인 정보 오류 |
| `INVALID_INVITE_CODE` | 400 | 초대 코드 오류 |
| `INVITE_CODE_ALREADY_USED` | 400 | 이미 사용된 초대 코드 |
| `BETA_LIMIT_REACHED` | 400 | 베타 정원 마감 |
| `TOKEN_EXPIRED` | 401 | 토큰 만료 |
| `INVALID_TOKEN` | 401 | 유효하지 않은 토큰 |
| `USER_NOT_FOUND` | 404 | 사용자 없음 |
| `SESSION_NOT_FOUND` | 404 | 세션 없음 |
| `RECEIVER_OFFLINE` | 400 | 수신자 오프라인 |
| `RECEIVER_IN_CALL` | 400 | 수신자 통화 중 |
| `ALREADY_FRIENDS` | 400 | 이미 친구 상태 |
| `ALREADY_BLOCKED` | 400 | 이미 차단 상태 |
| `CANNOT_BLOCK_SELF` | 400 | 자기 자신 차단 불가 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `ADMIN_REQUIRED` | 403 | 관리자 권한 필요 |
| `RATE_LIMIT_EXCEEDED` | 429 | 요청 횟수 초과 |
| `INTERNAL_SERVER_ERROR` | 500 | 서버 오류 |
| `EMAIL_NOT_VERIFIED` | 403 | 이메일 미인증 |
| `EMAIL_SEND_FAILED` | 500 | 이메일 전송 실패 |
| `NO_PENDING_VERIFICATION` | 400 | 대기 중인 인증 요청 없음 |
| `CODE_EXPIRED` | 400 | 인증 코드 만료 |
| `INCORRECT_CODE` | 400 | 잘못된 인증 코드 |
| `TOO_MANY_ATTEMPTS` | 429 | 인증 시도 횟수 초과 |
| `REDIS_NOT_CONFIGURED` | 500 | Redis 설정 오류 |
| `USER_BLOCKED` | 403 | 차단된 사용자 |
| `NOT_FRIENDS` | 403 | 친구 관계 아님 |
| `MAX_PHOTOS_EXCEEDED` | 400 | 최대 사진 수 초과 (6장) |
| `INVALID_AGE_RANGE` | 400 | 유효하지 않은 나이 범위 |

---

## 응답 형식

```json
// 성공
{ "success": true, "data": { ... } }

// 에러
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "에러 메시지" }
}
```

---

## Rate Limiting

| 대상 | 제한 | 기간 |
|------|------|------|
| 인증 API (login) | 5회 | 15분 |
| 비밀번호 재설정 | 3회 | 15분 |
| 일반 API | 100회 | 15분 |
| 파일 업로드 | 10회 | 1시간 |
| 관리자 API | 50회 | 15분 |
| 이메일 인증 재발송 | 10회 | 5분 |
