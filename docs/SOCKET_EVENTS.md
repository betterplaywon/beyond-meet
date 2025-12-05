# Socket.io 이벤트 명세

## 연결

```javascript
import { io } from 'socket.io-client';

const socket = io(API_BASE_URL, {
  auth: { token: accessToken },
  transports: ['websocket']
});

socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', (reason) => console.log('Disconnected:', reason));
socket.on('connect_error', (err) => console.error('Connection error:', err));
```

---

## 매칭 이벤트

### 랜덤 매칭 요청
**Client → Server**: `match:request`

```javascript
socket.emit('match:request', {
  userId: 'uuid-1234',
  filters: {
    preferredGender: 'FEMALE',  // optional
    minAge: 20,                  // optional
    maxAge: 30                   // optional
  }
});
```

### 매칭 대기 중
**Server → Client**: `match:waiting`

```javascript
socket.on('match:waiting', (data) => {
  // { message: '매칭 대기 중입니다...', queuePosition: 3 }
});
```

### 매칭 성공
**Server → Client**: `match:found`

```javascript
socket.on('match:found', (data) => {
  // {
  //   sessionId: 'session-uuid',
  //   partner: {
  //     id: 'uuid-5678',
  //     nickname: '김영희',
  //     profilePhotos: ['https://...'],
  //     age: 26,
  //     country: 'KR'
  //   },
  //   channelName: 'channel_1699097600_abc123',
  //   matchType: 'RANDOM'
  // }
});
```

### 매칭 취소
**Client → Server**: `match:cancel`

```javascript
socket.emit('match:cancel', { userId: 'uuid-1234' });
```

**Server → Client**: `match:cancelled`

```javascript
socket.on('match:cancelled', (data) => {
  // { message: '매칭이 취소되었습니다.' }
});
```

### 매칭 실패
**Server → Client**: `match:failed`

```javascript
socket.on('match:failed', (data) => {
  // { code: 'MATCH_TIMEOUT', message: '매칭 가능한 상대를 찾지 못했습니다.' }
});
```

---

## 통화 이벤트

### 통화 수신 (Direct Match)
**Server → Client**: `call:incoming`

```javascript
socket.on('call:incoming', (data) => {
  // {
  //   callId: 'call-uuid',
  //   sessionId: 'session-uuid',
  //   caller: {
  //     id: 'uuid-1234',
  //     nickname: '홍길동',
  //     profilePhotos: ['https://...']
  //   },
  //   channelName: 'channel_abc123'
  // }
});
```

### 통화 수락
**Client → Server**: `call:accept`

```javascript
socket.emit('call:accept', { sessionId: 'session-uuid' });
```

**Server → Client (발신자)**: `call:accepted`

```javascript
socket.on('call:accepted', (data) => {
  // { sessionId: 'session-uuid', message: '상대방이 통화를 수락했습니다.' }
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
  // { sessionId: 'session-uuid', message: '상대방이 통화를 거절했습니다.' }
});
```

### 통화 종료
**Client → Server**: `call:end`

```javascript
socket.emit('call:end', { callId: 'call-uuid', duration: 300 });
```

**Server → Client (상대방)**: `call:ended`

```javascript
socket.on('call:ended', (data) => {
  // { callId: 'call-uuid', message: '상대방이 통화를 종료했습니다.' }
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
**Server → Client (양측)**: `moderation:call-force-ended`

```javascript
socket.on('moderation:call-force-ended', (data) => {
  // {
  //   sessionId: 'session-uuid',
  //   reason: 'Inappropriate content detected'
  // }
});
```

---

## 온라인 상태 이벤트

### 온라인 상태 업데이트
**Client → Server**: `user:online`

```javascript
socket.emit('user:online', { userId: 'uuid-1234' });
```

### 친구 온라인 알림
**Server → Client**: `friend:online`

```javascript
socket.on('friend:online', (data) => {
  // { friendId: 'uuid-5678', nickname: '김영희' }
});
```

### 친구 오프라인 알림
**Server → Client**: `friend:offline`

```javascript
socket.on('friend:offline', (data) => {
  // { friendId: 'uuid-5678' }
});
```

---

## 이벤트 흐름 다이어그램

### 랜덤 매칭 흐름

```
User A                    Server                    User B
  │                         │                         │
  │── match:request ───────►│                         │
  │◄── match:waiting ───────│                         │
  │                         │◄── match:request ───────│
  │                         │─── match:waiting ──────►│
  │                         │                         │
  │◄── match:found ─────────│─── match:found ────────►│
  │                         │                         │
  │─────────── Agora Video Call ────────────────────►│
```

### Direct Call 흐름

```
User A (Caller)           Server             User B (Receiver)
  │                         │                         │
  │── POST /match/direct ──►│                         │
  │◄── 201 Created ─────────│                         │
  │                         │─── call:incoming ──────►│
  │                         │                         │
  │                         │◄── call:accept ─────────│
  │◄── call:accepted ───────│                         │
  │                         │                         │
  │─────────── Agora Video Call ────────────────────►│
```
