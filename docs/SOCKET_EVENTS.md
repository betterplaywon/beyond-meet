# Socket.io 이벤트 명세

## 연결

```javascript
import { io } from 'socket.io-client';

const socket = io(API_BASE_URL, {
  auth: {
    token: accessToken,
    refreshToken: refreshToken  // 토큰 자동 갱신을 위해 필요
  },
  transports: ['websocket']
});

socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', (reason) => console.log('Disconnected:', reason));
socket.on('connect_error', (err) => console.error('Connection error:', err));
```

**인증 실패 시:**
- `인증 토큰이 필요합니다` - 토큰 미제공
- `유효하지 않은 토큰입니다` - 토큰 검증 실패
- `인증 실패` - 기타 인증 오류

**토큰 자동 갱신:**

소켓 연결 시 accessToken이 만료된 경우, 서버에서 자동으로 refreshToken을 사용하여 새 토큰을 발급합니다.

```javascript
// 토큰 갱신 수신
socket.on('auth:token-refreshed', (data) => {
  // {
  //   accessToken: 'new-access-token',
  //   refreshToken: 'new-refresh-token'
  // }
  // 로컬 스토리지에 새 토큰 저장
  useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
});
```

---

## 이벤트 요약

### Client → Server
| 이벤트 | 설명 |
|--------|------|
| `match:request` | 랜덤/직접 매칭 요청 |
| `match:cancel` | 매칭 취소 |
| `call:accept` | 통화 수락 |
| `call:reject` | 통화 거절 |
| `call:end` | 통화 종료 |
| `moderation:warning` | 경고 발송 |
| `moderation:force-end` | 강제 종료 요청 |

### Server → Client
| 이벤트 | 설명 |
|--------|------|
| `match:waiting` | 매칭 대기 중 |
| `match:found` | 매칭 성공 |
| `match:failed` | 매칭 실패 |
| `match:cancelled` | 매칭 취소됨 |
| `call:incoming` | 수신 통화 |
| `call:requested` | 통화 요청됨 (발신자) |
| `call:accepted` | 통화 수락됨 |
| `call:rejected` | 통화 거절됨 |
| `call:ended` | 통화 종료됨 |
| `call:failed` | 통화 실패 |
| `friend:status-changed` | 친구 상태 변경 |
| `moderation:warning-received` | 경고 수신 |
| `moderation:call-force-ended` | 강제 종료 |
| `auth:token-refreshed` | 토큰 자동 갱신 |

---

## 매칭 이벤트

### 랜덤 매칭 요청
**Client → Server**: `match:request`

```javascript
// 랜덤 매칭
socket.emit('match:request', {
  type: 'RANDOM',
  filters: {
    preferredGender: 'FEMALE',  // optional: 'MALE' | 'FEMALE' | 'ANYONE'
    minAge: 20,                  // optional
    maxAge: 30                   // optional
  }
});

// 직접 통화 (친구에게)
socket.emit('match:request', {
  type: 'DIRECT',
  targetUserId: 'friend-uuid'
});
```

### 매칭 대기 중
**Server → Client**: `match:waiting`

```javascript
socket.on('match:waiting', (data) => {
  // { message: '매칭 상대를 찾고 있습니다...' }
});
```

### 매칭 성공
**Server → Client**: `match:found`

```javascript
socket.on('match:found', (data) => {
  // {
  //   session: {
  //     id: 'session-uuid',
  //     channelName: 'channel_1699097600_abc123'
  //   },
  //   partner: {
  //     id: 'uuid-5678',
  //     nickname: '김영희',
  //     profilePhotos: ['https://...'],
  //     age: 26,
  //     country: 'KR'
  //   },
  //   token: 'agora-rtc-token-for-this-user',
  //   uid: 12345
  // }
});
```

### 매칭 취소
**Client → Server**: `match:cancel`

```javascript
socket.emit('match:cancel');
```

**Server → Client**: `match:cancelled`

```javascript
socket.on('match:cancelled', (data) => {
  // { message: '매칭 요청이 취소되었습니다' }
});
```

### 매칭 실패
**Server → Client**: `match:failed`

```javascript
socket.on('match:failed', (data) => {
  // { reason: '매칭 요청 실패' }
});
```

---

## 통화 이벤트

### 통화 수신 (Direct Match)
**Server → Client**: `call:incoming`

```javascript
socket.on('call:incoming', (data) => {
  // {
  //   session: {
  //     id: 'session-uuid',
  //     channelName: 'channel_abc123'
  //   },
  //   caller: {
  //     id: 'uuid-1234',
  //     nickname: '홍길동',
  //     profilePhotos: ['https://...']
  //   }
  // }
});
```

### 통화 요청됨 (발신자)
**Server → Client**: `call:requested`

```javascript
socket.on('call:requested', (data) => {
  // {
  //   sessionId: 'session-uuid',
  //   receiverId: 'uuid-5678'
  // }
});
```

### 통화 수락
**Client → Server**: `call:accept`

```javascript
socket.emit('call:accept', { sessionId: 'session-uuid' });
```

**Server → Client (양쪽)**: `call:accepted`

```javascript
socket.on('call:accepted', (data) => {
  // {
  //   session: {
  //     id: 'session-uuid',
  //     channelName: 'channel_abc123'
  //   },
  //   token: 'agora-rtc-token-for-this-user',
  //   uid: 12345
  // }
});
```

### 통화 거절
**Client → Server**: `call:reject`

```javascript
socket.emit('call:reject', { sessionId: 'session-uuid' });
```

**Server → Client (발신자)**: `call:rejected`

```javascript
socket.on('call:rejected', (data) => {
  // { sessionId: 'session-uuid' }
});
```

### 통화 종료
**Client → Server**: `call:end`

```javascript
socket.emit('call:end', { sessionId: 'session-uuid' });
```

**Server → Client (양쪽)**: `call:ended`

```javascript
socket.on('call:ended', (data) => {
  // { sessionId: 'session-uuid', duration: 300 }
});
```

### 통화 실패
**Server → Client**: `call:failed`

```javascript
socket.on('call:failed', (data) => {
  // { reason: '통화 수락 실패' }
});
```

---

## 친구 상태 이벤트

### 친구 상태 변경
**Server → Client**: `friend:status-changed`

Socket 연결 시 친구들에게 ONLINE 상태, 연결 해제 시 OFFLINE 상태가 자동으로 브로드캐스트됩니다.

```javascript
socket.on('friend:status-changed', (data) => {
  // {
  //   friendId: 'uuid-5678',
  //   status: 'ONLINE' | 'OFFLINE',
  //   lastActive: '2025-01-04T12:00:00.000Z'
  // }
});
```

---

## 모더레이션 이벤트

### 경고 발송
**Client → Server**: `moderation:warning`

```javascript
socket.emit('moderation:warning', {
  sessionId: 'session-uuid',
  targetUserId: 'uuid-5678'
});
```

### 경고 수신
**Server → Client**: `moderation:warning-received`

```javascript
socket.on('moderation:warning-received', (data) => {
  // {
  //   sessionId: 'session-uuid',
  //   message: '부적절한 행동이 감지되었습니다. 경고를 받았습니다.'
  // }
});
```

### 강제 종료 요청
**Client → Server**: `moderation:force-end`

```javascript
socket.emit('moderation:force-end', {
  sessionId: 'session-uuid',
  reportedUserId: 'uuid-1234'
});
```

### 강제 종료 알림
**Server → Client (양쪽)**: `moderation:call-force-ended`

```javascript
socket.on('moderation:call-force-ended', (data) => {
  // {
  //   sessionId: 'session-uuid',
  //   reason: 'Inappropriate content detected'
  // }
});
```

---

## 이벤트 흐름 다이어그램

### 랜덤 매칭 흐름

```
User A                    Server                    User B
  │                         │                         │
  │── match:request ───────►│                         │
  │   (type: RANDOM)        │                         │
  │                         │                         │
  │◄── match:waiting ───────│                         │
  │                         │                         │
  │                         │◄── match:request ───────│
  │                         │    (type: RANDOM)       │
  │                         │                         │
  │                         │─── match:waiting ──────►│
  │                         │                         │
  │                         │  [Periodic Matching]    │
  │                         │                         │
  │◄── match:found ─────────│─── match:found ────────►│
  │  (session, partner,     │  (session, partner,     │
  │   token, uid)           │   token, uid)           │
  │                         │                         │
  │─────────── Agora Video Call ────────────────────►│
```

### Direct Call 흐름

```
User A (Caller)           Server             User B (Receiver)
  │                         │                         │
  │── match:request ───────►│                         │
  │   (type: DIRECT,        │                         │
  │    targetUserId: B)     │                         │
  │                         │                         │
  │◄── call:requested ──────│─── call:incoming ──────►│
  │   (sessionId, receiver) │   (session, caller)     │
  │                         │                         │
  │                         │◄── call:accept ─────────│
  │                         │    (sessionId)          │
  │                         │                         │
  │◄── call:accepted ───────│─── call:accepted ──────►│
  │  (session, token, uid)  │  (session, token, uid)  │
  │                         │                         │
  │─────────── Agora Video Call ────────────────────►│
```

### 통화 종료 흐름

```
User A                    Server                    User B
  │                         │                         │
  │── call:end ────────────►│                         │
  │   (sessionId)           │                         │
  │                         │                         │
  │◄── call:ended ──────────│─── call:ended ─────────►│
  │  (sessionId, duration)  │  (sessionId, duration)  │
  │                         │                         │
```

### 모더레이션 흐름

```
User A                    Server                    User B
  │                         │                         │
  │── moderation:force-end ►│                         │
  │   (sessionId,           │                         │
  │    reportedUserId: B)   │                         │
  │                         │                         │
  │◄─ moderation:call-      │── moderation:call- ───►│
  │   force-ended           │   force-ended           │
  │                         │                         │
  │                         │ [Auto Report Created]   │
```

---

## 주기적 매칭 시스템

서버는 10초마다 매칭 대기열의 모든 사용자를 대상으로 재매칭을 시도합니다.

- **startPeriodicMatching**: 서버 시작 시 호출
- **stopPeriodicMatching**: 서버 종료 시 호출

매칭 성공 시 양쪽 사용자에게 `match:found` 이벤트가 전송됩니다.

---

## 에러 처리

모든 에러는 해당 이벤트의 실패 이벤트로 전송됩니다:

| 원본 이벤트 | 에러 이벤트 |
|------------|------------|
| `match:request` | `match:failed` |
| `call:accept` | `call:failed` |
| 기타 | `error` |

```javascript
socket.on('error', (data) => {
  // { message: '오류 메시지' }
});
```
