# API 명세서

- **Base URL**: `https://your-app.onrender.com/api`
- **인증**: JWT Bearer Token (`Authorization: Bearer {accessToken}`)

---

## 엔드포인트 목록

### Auth
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/auth/register` | 회원가입 (초대 코드 필수) |
| POST | `/auth/login` | 로그인 |
| POST | `/auth/refresh` | 토큰 갱신 |
| POST | `/auth/logout` | 로그아웃 |

### Users
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/users/me` | 내 프로필 조회 |
| GET | `/users/:id` | 사용자 프로필 조회 |
| PUT | `/users/:id` | 프로필 수정 |
| POST | `/users/:id/photos` | 프로필 사진 업로드 |
| GET | `/users/:id/friends` | 친구 목록 조회 |
| POST | `/users/:id/friends` | 친구 추가 |
| DELETE | `/users/:id/friends/:friendId` | 친구 삭제 |
| POST | `/users/:id/block` | 사용자 차단 |

### Match (Socket.io)
| Event | 방향 | 설명 |
|-------|------|------|
| `match:request` | C → S | 랜덤 매칭 요청 |
| `match:cancel` | C → S | 매칭 취소 |
| `match:waiting` | S → C | 대기 중 |
| `match:found` | S → C | 매칭 성공 |
| `match:failed` | S → C | 매칭 실패 |

### Call
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/call/start` | 통화 시작 |
| POST | `/call/:callId/end` | 통화 종료 |
| GET | `/call/history` | 통화 기록 조회 |

### Agora
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/agora/token` | RTC 토큰 생성 |

### Push
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/push/register-device` | 디바이스 토큰 등록 |
| DELETE | `/push/unregister-device` | 디바이스 토큰 제거 |

### Admin
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/admin/invite-codes` | 초대 코드 생성 |
| GET | `/admin/invite-codes` | 초대 코드 목록 |
| GET | `/admin/stats` | 사용자 통계 |
| GET | `/admin/moderation-logs` | 모더레이션 로그 |
| GET | `/admin/reports` | 신고 목록 |

### Moderation
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/moderation/analyze` | 콘텐츠 분석 |
| POST | `/moderation/report` | 사용자 신고 |

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
    "user": { "id": "uuid", "email": "...", "nickname": "..." },
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
    "user": { "id": "uuid", "nickname": "...", "onlineStatus": "ONLINE" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
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
// 요청
socket.emit('match:request', { userId: 'uuid-1234' });

// 성공
socket.on('match:found', (data) => {
  // { sessionId, partner, channelName, matchType }
});
```

### 통화
```javascript
// 수신
socket.on('call:incoming', (data) => {
  // { callId, sessionId, caller, channelName }
});

// 수락/거절
socket.emit('call:accept', { sessionId });
socket.emit('call:reject', { sessionId });

// 종료
socket.emit('call:end', { callId, duration });
```

---

## 에러 코드

| 코드 | HTTP | 설명 |
|------|------|------|
| `VALIDATION_ERROR` | 400 | 입력 검증 실패 |
| `EMAIL_ALREADY_EXISTS` | 409 | 이메일 중복 |
| `INVALID_CREDENTIALS` | 401 | 로그인 정보 오류 |
| `INVALID_INVITE_CODE` | 400 | 초대 코드 오류 |
| `BETA_LIMIT_REACHED` | 400 | 베타 정원 마감 |
| `TOKEN_EXPIRED` | 401 | 토큰 만료 |
| `USER_NOT_FOUND` | 404 | 사용자 없음 |
| `RECEIVER_OFFLINE` | 400 | 수신자 오프라인 |

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

- **인증 API**: 15분당 5회
- **일반 API**: 15분당 100회
- **파일 업로드**: 1분당 3회
