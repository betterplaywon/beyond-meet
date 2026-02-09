# 영상 데이팅 앱 만들기 #15 - Beta 테스트와 피드백 반영

> **이전 글 요약**: Part 14에서 Render.com에 무료로 배포하고, GitHub Actions로 Cold Start 문제를 해결했다. 모든 서비스를 무료 티어로 조합해서 $0/월로 운영하는 데 성공했다.

드디어 Beyond Meet을 실제 사용자에게 공개할 시간이 됐다. 모든 기능을 구현하고 배포도 완료했지만, 실제 사용자 피드백 없이는 완성이라고 할 수 없었다.

---

## Beta 전략

### 제한된 초대 코드 시스템

**20명 한정** 베타 테스터로 제한하기로 했다. 초대 코드는 `BETA-0001` ~ `BETA-0020`으로 각 코드는 1회만 사용 가능하다.

베타 테스트를 제한한 이유가 몇 가지 있다. 무료 인프라 한도(Agora 10,000분/월, Supabase 500MB)를 지켜야 하고, 버그 발생 시 영향 범위를 제한할 수 있다. 적은 인원이 오히려 더 자세한 피드백을 제공해준다는 것도 알게 됐다.

### 초대 코드 생성

Prisma Seed 스크립트로 초대 코드를 미리 생성했다.

```typescript
// backend/prisma/seed.ts
async function main() {
  await prisma.inviteCode.deleteMany({});

  for (let i = 1; i <= 20; i++) {
    const code = `BETA-${String(i).padStart(4, '0')}`;
    await prisma.inviteCode.create({
      data: {
        code,
        maxUses: 1,
        usedCount: 0,
      },
    });
    console.log(`✅ Created invite code: ${code}`);
  }
}
```

---

## 초기 버그 수정

### 로그아웃 시 앱 크래시

테스터에게서 로그아웃 버튼 클릭 시 앱이 크래시된다는 보고가 들어왔다. 확인해보니 React Query mutation이 완료되기 전에 navigation이 실행되어 컴포넌트가 언마운트되는 것이 원인이었다.

```typescript
// 수정 후
const logout = () => {
  authStore.logout();

  // requestAnimationFrame으로 다음 프레임에 navigation 실행
  requestAnimationFrame(() => {
    navigation.navigate('Login');
  });
};
```

찾아보니 React Native에서 navigation과 상태 변경이 동시에 일어날 때 `requestAnimationFrame`을 사용하면 안정적이라고 한다. 현재 렌더링 사이클이 끝난 후 navigation이 실행되어 충돌을 방지한다.

### 친구 온라인 상태가 업데이트되지 않음

친구가 로그인해도 온라인 상태로 바뀌지 않는 문제도 있었다. Socket.io 이벤트 리스너가 중복 등록되어 이전 상태로 덮어써지는 것이 원인이었다.

```typescript
// 수정 후
useEffect(() => {
  const handleStatusChanged = (data) => {
    queryClient.setQueryData(/* ... */);
  };

  socket.on('friend:status-changed', handleStatusChanged);

  return () => {
    socket.off('friend:status-changed', handleStatusChanged); // 클린업 추가
  };
}, [socket, queryClient]);
```

컴포넌트가 다시 렌더링될 때마다 새 리스너가 추가되는데, 이전 리스너가 제거되지 않으면 중복 실행된다. `socket.off`로 명시적으로 제거해야 한다.

---

## 사용자 피드백 수집

Google Forms로 피드백 설문을 만들어서 배포했다.

### 주요 피드백

**긍정적 피드백**:
- "텍스트 없이 바로 영상으로 만나니 빠르고 좋다"
- "5분 제한이 부담 없어서 좋다"
- "AI 모더레이션 덕분에 안전하다고 느껴진다"

**개선 요청**:
1. 매칭 대기 인원 표시: 현재 몇 명이 대기 중인지 알 수 없다
2. 통화 품질 표시: 네트워크 상태 인디케이터가 필요하다
3. 온라인 친구만 보기: 오프라인 친구를 필터링하는 옵션이 필요하다

---

## 피드백 반영

### 매칭 대기 인원 표시

"몇 명이 매칭 대기 중인지 보고 싶어요"라는 요청이 있었다.

```typescript
// backend/src/sockets/match-handler.ts
setInterval(() => {
  io.emit('match:waiting-count', {
    count: waitingQueue.size,
  });
}, 5000); // 5초마다 업데이트
```

```typescript
// mobile/src/screens/match/MatchingScreen.tsx
const [waitingCount, setWaitingCount] = useState<number>(0);

useSocketEvent('match:waiting-count', (data: { count: number }) => {
  setWaitingCount(data.count);
});

return (
  <View>
    <Text>대기 중인 사람: {waitingCount}명</Text>
  </View>
);
```

### 통화 품질 표시

"네트워크가 느린지 빠른지 알 수 없어요"라는 피드백에 따라 Agora SDK의 `onNetworkQuality` 이벤트를 사용해서 네트워크 상태 인디케이터를 추가했다.

```typescript
agoraEngine.registerEventHandler({
  onNetworkQuality: (connection, uid, txQuality, rxQuality) => {
    if (uid === localUid) {
      setNetworkQuality(txQuality); // 1: 좋음, 2: 보통, 3: 나쁨
    }
  },
});
```

### 온라인 친구만 보기 필터

"오프라인 친구가 많아서 온라인 친구를 찾기 어려워요"라는 요청에 따라 필터 토글을 추가했다.

```typescript
const [showOnlineOnly, setShowOnlineOnly] = useState(false);

const filteredFriends = useMemo(() => {
  if (showOnlineOnly) {
    return friends.filter(f => f.onlineStatus === 'ONLINE');
  }
  return friends;
}, [friends, showOnlineOnly]);
```

---

## 사용 통계 분석

### 실제 사용량 (Beta 2주차)

| 항목 | 예상 | 실제 | 비율 |
|------|------|------|------|
| 가입자 수 | 20명 | 18명 | 90% |
| 일 평균 활성 사용자 | 10명 | 12명 | 120% |
| 월 총 통화 시간 | 3,000분 | ~4,060분 | 135% |
| Agora 사용량 | 3,000분/10,000분 | 4,060분/10,000분 | 40.6% |

여전히 무료 한도 내에서 운영 중이었다.

### AI 모더레이션 통계

- **총 통화 세션**: 312건
- **AI 분석 프레임**: 23,400장
- **경고 발생**: 3건 (1.0%)
- **강제 종료**: 0건
- **Hugging Face 사용량**: 23,400건/30,000건 (78%)

AI 모더레이션이 예상보다 잘 작동했다. 대부분의 통화는 정상이었고, 경고도 극소수였다.

---

## 성능 최적화

### React Query Stale Time 조정

친구 목록이 너무 자주 재조회되어 불필요한 네트워크 요청이 발생하는 문제가 있었다.

```typescript
const { data: friends } = useQuery({
  queryKey: friendsKeys.list(userId),
  queryFn: () => friendsApi.getFriends(),
  staleTime: 5 * 60 * 1000, // 5분
  gcTime: 10 * 60 * 1000, // 10분
});
```

`staleTime`은 데이터가 "신선"하다고 간주되는 시간으로, 이 시간 동안은 재조회하지 않는다. `gcTime`은 캐시에서 삭제되기까지의 시간이다. 찾아보니 React Query v5에서 `cacheTime`이 `gcTime`으로 이름이 변경됐다고 한다.

### Rate Limiting 강화

베타 테스트 중 한 사용자가 실수로 매칭 버튼을 연타해서 서버에 부하를 준 적이 있었다. 1분에 최대 3회로 제한하는 rate limiter를 추가했다.

---

## 겪었던 문제들

### iOS TestFlight 빌드 실패

Xcode에서 Archive 빌드 시 Provisioning profile 서명 에러가 발생했다. Apple Developer에서 기존 인증서를 삭제하고 새로 Distribution Certificate와 Provisioning Profile을 생성해서 해결했다.

### Supabase Storage 업로드 느림

프로필 사진 업로드가 5초 이상 소요되는 문제가 있었다. 원본 이미지가 5-10MB로 크기 때문이었다. react-native-image-picker의 `quality` 옵션을 0.8에서 0.7로 낮추고 `maxWidth`, `maxHeight`를 1024로 제한해서 평균 파일 크기를 500KB로 줄였다. 업로드 시간이 1-2초로 단축됐다.

---

## Beta 테스트 성과

### 정량적 성과

- 가입률: 90% (18명/20명)
- 일 평균 활성 사용자: 12명
- 평균 만족도: 4.2/5.0
- 월 운영 비용: **$0**

### 배운 점

무료 인프라 조합의 가능성을 확인했다. Render, Supabase, Agora, Firebase 등을 조합하면 실제 서비스를 $0/월로 운영할 수 있다.

사용자 피드백의 중요성도 느꼈다. 예상하지 못한 사용 패턴을 발견할 수 있었다. 온라인 친구만 보기 필터 같은 기능은 직접 사용해보지 않으면 생각해내기 어려운 요청이었다.

베타 테스트를 소수 인원으로 제한한 것도 좋은 선택이었다. 집중 관리해서 높은 품질의 피드백을 수집할 수 있었다.

---

## 마무리

Beyond Meet 프로젝트를 처음부터 끝까지 구현하면서 많은 것을 배웠다. JWT 인증부터 WebRTC 영상 통화, AI 콘텐츠 모더레이션, 무료 배포까지 실제 서비스를 만드는 전 과정을 경험했다.

특히 **무료 인프라만으로 실제 서비스를 운영**할 수 있다는 것을 증명한 것이 가장 의미 있었다. 베타 테스트를 통해 사용자들의 긍정적인 피드백을 받았고, 앞으로 더 많은 사람들이 Beyond Meet을 사용하기를 기대한다.

이 시리즈가 누군가에게 도움이 되었으면 좋겠다.

---

**태그**: `Beta 테스트` `사용자 피드백` `버그 수정` `성능 최적화` `React Query`
