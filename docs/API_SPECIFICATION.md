# API 명세서
## WebRTC 기반 영상 통화 데이팅 앱 백엔드 API

---

## 📋 문서 정보

- **작성일**: 2025-11-04
- **버전**: 1.0.0
- **Base URL**: `https://your-app.onrender.com/api`
- **프로토콜**: HTTPS
- **인증 방식**: JWT Bearer Token

---

## 🔐 인증 (Authentication)

### 공통 헤더

모든 인증이 필요한 API는 다음 헤더 포함:

```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### 에러 응답 (공통)

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": {}
  }
}
```

---

## 📚 API 엔드포인트 목록

### 1. 인증 (Auth)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| POST | `/auth/register` | 회원가입 (초대 코드 필수) | ❌ |
| POST | `/auth/login` | 로그인 | ❌ |
| POST | `/auth/refresh` | 토큰 갱신 | ❌ |
| POST | `/auth/logout` | 로그아웃 | ✅ |
| POST | `/auth/forgot-password` | 비밀번호 재설정 요청 | ❌ |
| POST | `/auth/reset-password` | 비밀번호 재설정 | ❌ |
| POST | `/auth/validate-invite` | 초대 코드 검증 | ❌ |

### 2. 사용자 (Users)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| GET | `/users/me` | 내 프로필 조회 | ✅ |
| GET | `/users/:id` | 사용자 프로필 조회 | ✅ |
| PUT | `/users/:id` | 프로필 수정 | ✅ |
| POST | `/users/:id/photos` | 프로필 사진 업로드 | ✅ |
| DELETE | `/users/:id/photos/:photoId` | 프로필 사진 삭제 | ✅ |
| GET | `/users/:id/friends` | 친구 목록 조회 | ✅ |
| POST | `/users/:id/friends` | 친구 추가 | ✅ |
| DELETE | `/users/:id/friends/:friendId` | 친구 삭제 | ✅ |
| POST | `/users/:id/block` | 사용자 차단 | ✅ |
| DELETE | `/users/:id/block/:blockedId` | 차단 해제 | ✅ |

### 3. 매칭 (Match)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| POST | `/match/random` | 랜덤 매칭 요청 | ✅ |
| POST | `/match/direct` | 선택 매칭 요청 | ✅ |
| DELETE | `/match/:sessionId` | 매칭 취소 | ✅ |
| GET | `/match/:sessionId` | 매칭 세션 조회 | ✅ |

### 4. 통화 (Call)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| POST | `/call/start` | 통화 시작 | ✅ |
| POST | `/call/:callId/end` | 통화 종료 | ✅ |
| GET | `/call/history` | 통화 기록 조회 | ✅ |
| POST | `/call/:callId/event` | 통화 이벤트 기록 | ✅ |

### 5. Agora

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| POST | `/agora/token` | RTC 토큰 생성 | ✅ |

### 6. 푸시 알림 (Push)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| POST | `/push/register-device` | 디바이스 토큰 등록 | ✅ |
| DELETE | `/push/unregister-device` | 디바이스 토큰 제거 | ✅ |

### 7. 초대 코드 (Admin)

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|-----------|
| POST | `/admin/invite-codes` | 초대 코드 생성 | ✅ (관리자) |
| GET | `/admin/invite-codes` | 초대 코드 목록 조회 | ✅ (관리자) |
| GET | `/admin/stats` | 사용자 통계 조회 | ✅ (관리자) |

---

## 🔐 1. 인증 API (Auth)

### 1.1 회원가입

**POST** `/api/auth/register`

#### 요청 (Request)

```json
{
  "inviteCode": "BETA2025ABC",
  "email": "user@example.com",
  "password": "Password123!",
  "nickname": "홍길동",
  "birthDate": "1995-03-15",
  "gender": "MALE",
  "country": "KR",
  "bio": "안녕하세요! 만나서 반가워요.",
  "profilePhotos": ["https://storage.url/photo1.jpg"],
  "interests": ["여행", "음악", "운동"],
  "preferredGender": "FEMALE",
  "minAge": 20,
  "maxAge": 30,
  "preferredCountries": ["KR", "JP"]
}
```

**Note**: `inviteCode`는 Beta 테스트 기간 동안 필수입니다.

#### 응답 (Response)

**성공 (201 Created)**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-1234",
      "email": "user@example.com",
      "nickname": "홍길동",
      "birthDate": "1995-03-15",
      "gender": "MALE",
      "country": "KR",
      "bio": "안녕하세요! 만나서 반가워요.",
      "profilePhotos": ["https://storage.url/photo1.jpg"],
      "interests": ["여행", "음악", "운동"],
      "createdAt": "2025-11-04T10:00:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**실패 (400 Bad Request)**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "이메일 형식이 올바르지 않습니다.",
    "details": {
      "field": "email"
    }
  }
}
```

**실패 (409 Conflict)**

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "이미 사용 중인 이메일입니다."
  }
}
```

**실패 (400 Bad Request - 초대 코드 관련)**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INVITE_CODE",
    "message": "유효하지 않은 초대 코드입니다."
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "INVITE_CODE_EXPIRED",
    "message": "만료된 초대 코드입니다."
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "INVITE_CODE_LIMIT_REACHED",
    "message": "초대 코드 사용 횟수가 초과되었습니다."
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "BETA_LIMIT_REACHED",
    "message": "현재 베타 테스트 정원이 마감되었습니다. 곧 공개 예정입니다."
  }
}
```

---

### 1.2 로그인

**POST** `/api/auth/login`

#### 요청

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-1234",
      "email": "user@example.com",
      "nickname": "홍길동",
      "profilePhotos": ["https://storage.url/photo1.jpg"],
      "onlineStatus": "ONLINE"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**실패 (401 Unauthorized)**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "이메일 또는 비밀번호가 올바르지 않습니다."
  }
}
```

---

### 1.3 토큰 갱신

**POST** `/api/auth/refresh`

#### 요청

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.4 로그아웃

**POST** `/api/auth/logout`

**Headers**: `Authorization: Bearer {accessToken}`

#### 요청

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "message": "로그아웃되었습니다."
}
```

---

### 1.5 초대 코드 검증

**POST** `/api/auth/validate-invite`

#### 요청

```json
{
  "inviteCode": "BETA2025ABC"
}
```

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "message": "유효한 초대 코드입니다."
  }
}
```

**실패 (400 Bad Request)**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INVITE_CODE",
    "message": "유효하지 않은 초대 코드입니다."
  }
}
```

---

## 👤 2. 사용자 API (Users)

### 2.1 내 프로필 조회

**GET** `/api/users/me`

**Headers**: `Authorization: Bearer {accessToken}`

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": "uuid-1234",
    "email": "user@example.com",
    "nickname": "홍길동",
    "birthDate": "1995-03-15",
    "gender": "MALE",
    "country": "KR",
    "bio": "안녕하세요! 만나서 반가워요.",
    "profilePhotos": [
      "https://storage.url/photo1.jpg",
      "https://storage.url/photo2.jpg"
    ],
    "interests": ["여행", "음악", "운동"],
    "preferredGender": "FEMALE",
    "minAge": 20,
    "maxAge": 30,
    "preferredCountries": ["KR", "JP"],
    "onlineStatus": "ONLINE",
    "createdAt": "2025-11-04T10:00:00Z"
  }
}
```

---

### 2.2 사용자 프로필 조회

**GET** `/api/users/:id`

**Headers**: `Authorization: Bearer {accessToken}`

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": "uuid-5678",
    "nickname": "김영희",
    "birthDate": "1997-06-20",
    "gender": "FEMALE",
    "country": "KR",
    "bio": "새로운 사람들을 만나는 걸 좋아해요!",
    "profilePhotos": ["https://storage.url/photo3.jpg"],
    "interests": ["카페", "영화", "책"],
    "onlineStatus": "ONLINE"
  }
}
```

**실패 (404 Not Found)**

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "사용자를 찾을 수 없습니다."
  }
}
```

---

### 2.3 프로필 수정

**PUT** `/api/users/:id`

**Headers**: `Authorization: Bearer {accessToken}`

#### 요청

```json
{
  "nickname": "새닉네임",
  "bio": "수정된 자기소개",
  "interests": ["요리", "등산"],
  "minAge": 22,
  "maxAge": 28,
  "preferredCountries": ["KR"]
}
```

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": "uuid-1234",
    "nickname": "새닉네임",
    "bio": "수정된 자기소개",
    "interests": ["요리", "등산"],
    "minAge": 22,
    "maxAge": 28,
    "preferredCountries": ["KR"],
    "updatedAt": "2025-11-04T11:00:00Z"
  }
}
```

---

### 2.4 프로필 사진 업로드

**POST** `/api/users/:id/photos`

**Headers**:
- `Authorization: Bearer {accessToken}`
- `Content-Type: multipart/form-data`

#### 요청 (Form Data)

```
photo: [파일]
```

#### 응답

**성공 (201 Created)**

```json
{
  "success": true,
  "data": {
    "photoUrl": "https://storage.url/photo-new.jpg",
    "profilePhotos": [
      "https://storage.url/photo1.jpg",
      "https://storage.url/photo2.jpg",
      "https://storage.url/photo-new.jpg"
    ]
  }
}
```

**실패 (400 Bad Request)**

```json
{
  "success": false,
  "error": {
    "code": "MAX_PHOTOS_EXCEEDED",
    "message": "최대 5장까지 업로드할 수 있습니다."
  }
}
```

---

### 2.5 친구 목록 조회

**GET** `/api/users/:id/friends`

**Headers**: `Authorization: Bearer {accessToken}`

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "friends": [
      {
        "id": "uuid-5678",
        "nickname": "김영희",
        "profilePhotos": ["https://storage.url/photo3.jpg"],
        "onlineStatus": "ONLINE",
        "createdAt": "2025-11-01T10:00:00Z"
      },
      {
        "id": "uuid-9012",
        "nickname": "이철수",
        "profilePhotos": ["https://storage.url/photo4.jpg"],
        "onlineStatus": "OFFLINE",
        "createdAt": "2025-11-02T14:30:00Z"
      }
    ],
    "total": 2
  }
}
```

---

### 2.6 친구 추가

**POST** `/api/users/:id/friends`

**Headers**: `Authorization: Bearer {accessToken}`

#### 요청

```json
{
  "friendId": "uuid-5678"
}
```

#### 응답

**성공 (201 Created)**

```json
{
  "success": true,
  "message": "친구가 추가되었습니다.",
  "data": {
    "friendship": {
      "id": "friendship-uuid",
      "userId": "uuid-1234",
      "friendId": "uuid-5678",
      "createdAt": "2025-11-04T12:00:00Z"
    }
  }
}
```

---

### 2.7 친구 삭제

**DELETE** `/api/users/:id/friends/:friendId`

**Headers**: `Authorization: Bearer {accessToken}`

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "message": "친구가 삭제되었습니다."
}
```

---

### 2.8 사용자 차단

**POST** `/api/users/:id/block`

**Headers**: `Authorization: Bearer {accessToken}`

#### 요청

```json
{
  "blockedUserId": "uuid-9999"
}
```

#### 응답

**성공 (201 Created)**

```json
{
  "success": true,
  "message": "사용자를 차단했습니다."
}
```

---

## 🔀 3. 매칭 API (Match)

### 3.1 랜덤 매칭 요청

**POST** `/api/match/random`

**Headers**: `Authorization: Bearer {accessToken}`

#### 요청

```json
{
  "userId": "uuid-1234"
}
```

#### 응답

**성공 (200 OK) - 즉시 매칭**

```json
{
  "success": true,
  "data": {
    "matched": true,
    "session": {
      "id": "session-uuid",
      "userId1": "uuid-1234",
      "userId2": "uuid-5678",
      "channelName": "channel_1699097600_abc123xyz",
      "matchType": "RANDOM",
      "status": "PENDING",
      "createdAt": "2025-11-04T13:00:00Z"
    },
    "partner": {
      "id": "uuid-5678",
      "nickname": "김영희",
      "profilePhotos": ["https://storage.url/photo3.jpg"],
      "age": 26,
      "country": "KR"
    }
  }
}
```

**성공 (200 OK) - 대기 중**

```json
{
  "success": true,
  "data": {
    "matched": false,
    "message": "매칭 대기 중입니다..."
  }
}
```

---

### 3.2 선택 매칭 요청 (친구에게 통화 요청)

**POST** `/api/match/direct`

**Headers**: `Authorization: Bearer {accessToken}`

#### 요청

```json
{
  "callerId": "uuid-1234",
  "receiverId": "uuid-5678"
}
```

#### 응답

**성공 (201 Created)**

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session-uuid",
      "userId1": "uuid-1234",
      "userId2": "uuid-5678",
      "channelName": "channel_1699097700_def456uvw",
      "matchType": "DIRECT",
      "status": "PENDING",
      "createdAt": "2025-11-04T13:10:00Z"
    }
  }
}
```

**실패 (400 Bad Request)**

```json
{
  "success": false,
  "error": {
    "code": "RECEIVER_OFFLINE",
    "message": "상대방이 오프라인입니다."
  }
}
```

---

### 3.3 매칭 취소

**DELETE** `/api/match/:sessionId`

**Headers**: `Authorization: Bearer {accessToken}`

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "message": "매칭이 취소되었습니다."
}
```

---

### 3.4 매칭 세션 조회

**GET** `/api/match/:sessionId`

**Headers**: `Authorization: Bearer {accessToken}`

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "session-uuid",
      "userId1": "uuid-1234",
      "userId2": "uuid-5678",
      "channelName": "channel_1699097600_abc123xyz",
      "matchType": "RANDOM",
      "status": "ACTIVE",
      "startTime": "2025-11-04T13:05:00Z",
      "endTime": null,
      "duration": null,
      "createdAt": "2025-11-04T13:00:00Z"
    }
  }
}
```

---

## 📞 4. 통화 API (Call)

### 4.1 통화 시작

**POST** `/api/call/start`

**Headers**: `Authorization: Bearer {accessToken}`

#### 요청

```json
{
  "sessionId": "session-uuid",
  "callerId": "uuid-1234",
  "receiverId": "uuid-5678"
}
```

#### 응답

**성공 (201 Created)**

```json
{
  "success": true,
  "data": {
    "call": {
      "id": "call-uuid",
      "sessionId": "session-uuid",
      "callerId": "uuid-1234",
      "receiverId": "uuid-5678",
      "status": "ONGOING",
      "startTime": "2025-11-04T13:05:00Z",
      "createdAt": "2025-11-04T13:05:00Z"
    }
  }
}
```

---

### 4.2 통화 종료

**POST** `/api/call/:callId/end`

**Headers**: `Authorization: Bearer {accessToken}`

#### 요청

```json
{
  "endTime": "2025-11-04T13:10:00Z",
  "duration": 300
}
```

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "call": {
      "id": "call-uuid",
      "sessionId": "session-uuid",
      "callerId": "uuid-1234",
      "receiverId": "uuid-5678",
      "status": "COMPLETED",
      "startTime": "2025-11-04T13:05:00Z",
      "endTime": "2025-11-04T13:10:00Z",
      "duration": 300
    }
  }
}
```

---

### 4.3 통화 기록 조회

**GET** `/api/call/history`

**Headers**: `Authorization: Bearer {accessToken}`

**Query Parameters**:
- `userId`: 사용자 ID (필수)
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 20)

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "calls": [
      {
        "id": "call-uuid-1",
        "partner": {
          "id": "uuid-5678",
          "nickname": "김영희",
          "profilePhotos": ["https://storage.url/photo3.jpg"]
        },
        "status": "COMPLETED",
        "startTime": "2025-11-04T13:05:00Z",
        "endTime": "2025-11-04T13:10:00Z",
        "duration": 300
      },
      {
        "id": "call-uuid-2",
        "partner": {
          "id": "uuid-9012",
          "nickname": "이철수",
          "profilePhotos": ["https://storage.url/photo4.jpg"]
        },
        "status": "MISSED",
        "startTime": "2025-11-03T18:20:00Z",
        "endTime": null,
        "duration": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

---

### 4.4 통화 이벤트 기록

**POST** `/api/call/:callId/event`

**Headers**: `Authorization: Bearer {accessToken}`

#### 요청

```json
{
  "eventType": "CAMERA_SWITCHED",
  "timestamp": "2025-11-04T13:07:30Z",
  "metadata": {
    "from": "FRONT",
    "to": "BACK"
  }
}
```

#### 응답

**성공 (201 Created)**

```json
{
  "success": true,
  "message": "이벤트가 기록되었습니다."
}
```

---

## 🎥 5. Agora API

### 5.1 RTC 토큰 생성

**POST** `/api/agora/token`

**Headers**: `Authorization: Bearer {accessToken}`

#### 요청

```json
{
  "channelName": "channel_1699097600_abc123xyz",
  "uid": 0
}
```

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "token": "006abc123def456ghi789jkl012mno345pqr678stu901vwx234yz...",
    "channelName": "channel_1699097600_abc123xyz",
    "uid": 0,
    "expiresAt": "2025-11-04T14:05:00Z"
  }
}
```

---

## 🔔 6. 푸시 알림 API (Push)

### 6.1 디바이스 토큰 등록

**POST** `/api/push/register-device`

**Headers**: `Authorization: Bearer {accessToken}`

#### 요청

```json
{
  "userId": "uuid-1234",
  "deviceToken": "fcm_token_abcdef123456",
  "platform": "IOS"
}
```

#### 응답

**성공 (201 Created)**

```json
{
  "success": true,
  "message": "디바이스 토큰이 등록되었습니다."
}
```

---

### 6.2 디바이스 토큰 제거

**DELETE** `/api/push/unregister-device`

**Headers**: `Authorization: Bearer {accessToken}`

#### 요청

```json
{
  "deviceToken": "fcm_token_abcdef123456"
}
```

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "message": "디바이스 토큰이 제거되었습니다."
}
```

---

## 🔧 7. 관리자 API (Admin)

### 7.1 초대 코드 생성

**POST** `/api/admin/invite-codes`

**Headers**: `Authorization: Bearer {accessToken}` (관리자 권한 필요)

#### 요청

```json
{
  "count": 20,
  "maxUses": 1,
  "expiresInDays": 30
}
```

#### 응답

**성공 (201 Created)**

```json
{
  "success": true,
  "data": {
    "inviteCodes": [
      {
        "id": "uuid-1",
        "code": "BETA2025ABC",
        "maxUses": 1,
        "usedCount": 0,
        "isActive": true,
        "expiresAt": "2025-12-04T00:00:00Z",
        "createdAt": "2025-11-04T10:00:00Z"
      },
      {
        "id": "uuid-2",
        "code": "BETA2025DEF",
        "maxUses": 1,
        "usedCount": 0,
        "isActive": true,
        "expiresAt": "2025-12-04T00:00:00Z",
        "createdAt": "2025-11-04T10:00:00Z"
      }
      // ... 18개 더
    ],
    "total": 20
  }
}
```

---

### 7.2 초대 코드 목록 조회

**GET** `/api/admin/invite-codes`

**Headers**: `Authorization: Bearer {accessToken}` (관리자 권한 필요)

**Query Parameters**:
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 20)
- `isActive`: 활성 상태 필터 (true/false)

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "inviteCodes": [
      {
        "id": "uuid-1",
        "code": "BETA2025ABC",
        "maxUses": 1,
        "usedCount": 1,
        "isActive": true,
        "expiresAt": "2025-12-04T00:00:00Z",
        "createdAt": "2025-11-04T10:00:00Z",
        "usedBy": [
          {
            "userId": "uuid-1234",
            "nickname": "홍길동",
            "usedAt": "2025-11-05T14:20:00Z"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 20,
      "totalPages": 1
    }
  }
}
```

---

### 7.3 사용자 통계 조회

**GET** `/api/admin/stats`

**Headers**: `Authorization: Bearer {accessToken}` (관리자 권한 필요)

#### 응답

**성공 (200 OK)**

```json
{
  "success": true,
  "data": {
    "totalUsers": 18,
    "betaLimit": 20,
    "remainingSlots": 2,
    "activeUsers": 12,
    "totalCalls": 145,
    "totalCallDuration": 21600,
    "averageCallDuration": 149,
    "inviteCodes": {
      "total": 20,
      "used": 18,
      "unused": 2,
      "expired": 0
    },
    "lastUpdated": "2025-11-04T10:00:00Z"
  }
}
```

---

## 🔌 WebSocket (Socket.io) 이벤트

### 연결 (Connection)

**클라이언트 → 서버**

```javascript
socket.connect({
  auth: {
    token: 'jwt_access_token'
  }
});
```

**서버 → 클라이언트**

```javascript
socket.on('connect', () => {
  console.log('Connected to server');
});
```

---

### 매칭 이벤트

#### 랜덤 매칭 요청

**클라이언트 → 서버**

```javascript
socket.emit('match:request', {
  userId: 'uuid-1234'
});
```

#### 매칭 성공

**서버 → 클라이언트**

```javascript
socket.on('match:found', (data) => {
  console.log(data);
  /*
  {
    sessionId: 'session-uuid',
    partner: {
      id: 'uuid-5678',
      nickname: '김영희',
      profilePhotos: ['https://storage.url/photo3.jpg']
    },
    channelName: 'channel_1699097600_abc123xyz'
  }
  */
});
```

---

### 통화 이벤트

#### 통화 요청 (선택 매칭)

**서버 → 클라이언트 (수신자)**

```javascript
socket.on('call:incoming', (data) => {
  console.log(data);
  /*
  {
    callId: 'call-uuid',
    sessionId: 'session-uuid',
    caller: {
      id: 'uuid-1234',
      nickname: '홍길동',
      profilePhotos: ['https://storage.url/photo1.jpg']
    },
    channelName: 'channel_1699097700_def456uvw'
  }
  */
});
```

#### 통화 수락

**클라이언트 → 서버**

```javascript
socket.emit('call:accept', {
  sessionId: 'session-uuid'
});
```

**서버 → 클라이언트 (발신자)**

```javascript
socket.on('call:accepted', (data) => {
  console.log(data);
  /*
  {
    sessionId: 'session-uuid',
    message: '상대방이 통화를 수락했습니다.'
  }
  */
});
```

#### 통화 거절

**클라이언트 → 서버**

```javascript
socket.emit('call:reject', {
  sessionId: 'session-uuid'
});
```

**서버 → 클라이언트 (발신자)**

```javascript
socket.on('call:rejected', (data) => {
  console.log(data);
  /*
  {
    sessionId: 'session-uuid',
    message: '상대방이 통화를 거절했습니다.'
  }
  */
});
```

#### 통화 종료

**클라이언트 → 서버**

```javascript
socket.emit('call:end', {
  callId: 'call-uuid',
  duration: 300
});
```

**서버 → 클라이언트 (상대방)**

```javascript
socket.on('call:ended', (data) => {
  console.log(data);
  /*
  {
    callId: 'call-uuid',
    message: '상대방이 통화를 종료했습니다.'
  }
  */
});
```

---

### 온라인 상태 이벤트

#### 온라인 상태 업데이트

**클라이언트 → 서버**

```javascript
socket.emit('user:online', {
  userId: 'uuid-1234'
});
```

#### 친구 온라인 알림

**서버 → 클라이언트**

```javascript
socket.on('friend:online', (data) => {
  console.log(data);
  /*
  {
    friendId: 'uuid-5678',
    nickname: '김영희'
  }
  */
});
```

---

## 📊 에러 코드 참조

| 코드 | HTTP 상태 | 설명 |
|------|-----------|------|
| `VALIDATION_ERROR` | 400 | 입력 검증 실패 |
| `EMAIL_ALREADY_EXISTS` | 409 | 이메일 중복 |
| `INVALID_CREDENTIALS` | 401 | 로그인 정보 오류 |
| `UNAUTHORIZED` | 401 | 인증 필요 |
| `TOKEN_EXPIRED` | 401 | 토큰 만료 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `USER_NOT_FOUND` | 404 | 사용자 없음 |
| `SESSION_NOT_FOUND` | 404 | 세션 없음 |
| `RECEIVER_OFFLINE` | 400 | 수신자 오프라인 |
| `MAX_PHOTOS_EXCEEDED` | 400 | 사진 개수 초과 |
| `INTERNAL_SERVER_ERROR` | 500 | 서버 오류 |

---

## 🔒 보안 고려사항

### Rate Limiting

- **인증 API**: 15분당 5회
- **일반 API**: 15분당 100회
- **파일 업로드**: 1분당 3회

### CORS

```
Allowed Origins:
- https://your-app.com
- https://staging.your-app.com
```

### 비밀번호 정책

- 최소 8자 이상
- 영문 대소문자, 숫자, 특수문자 중 2가지 이상 포함
- bcrypt 해싱 (salt rounds: 10)

---

## 📝 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2025-11-04 | 초안 작성 |

---

**문서 끝**
