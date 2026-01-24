# Part 15: Beta 테스트 및 피드백 반영

## 1. Beta 출시 준비

드디어 Beyond Meet을 실제 사용자에게 공개할 시간이다. 모든 기능을 구현하고 배포도 완료했지만, 실제 사용자 피드백 없이는 완성이라고 할 수 없다.

### 1.1 Beta 전략

**제한된 초대 코드 시스템**:
- **20명 한정** 베타 테스터
- 초대 코드: `BETA-0001` ~ `BETA-0020`
- 각 코드는 1회만 사용 가능

검색해보니 베타 테스트를 제한하는 이유는:
1. **무료 인프라 한도 준수**: Agora 10,000분/월, Supabase 500MB
2. **버그 발생 시 영향 범위 제한**: 소수 인원으로 집중 관리
3. **고품질 피드백 수집**: 적은 인원이 더 자세한 피드백 제공

### 1.2 초대 코드 생성

Prisma Seed 스크립트로 초대 코드를 미리 생성했다.

```typescript
// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 기존 초대 코드 삭제
  await prisma.inviteCode.deleteMany({});

  // BETA-0001 ~ BETA-0020 생성
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

  console.log(`\n🎉 Generated 20 beta invite codes!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

실행:
```bash
cd backend
npm run db:seed
```

## 2. 베타 테스트 시나리오

### 2.1 핵심 시나리오 정의

테스터들에게 다음 시나리오를 따라 테스트해달라고 요청했다:

**시나리오 1: 회원가입 및 프로필 설정**
1. 초대 코드로 회원가입
2. 프로필 사진 3장 업로드
3. 자기소개 작성
4. 매칭 필터 설정 (성별, 나이, 국가)

**시나리오 2: 랜덤 매칭**
1. "랜덤 매칭" 버튼 클릭
2. 매칭 대기 (최대 30초)
3. 매칭 성공 시 영상 통화 시작
4. 5분 통화 후 친구 추가 여부 선택

**시나리오 3: 친구 직접 통화**
1. 친구 목록에서 온라인 친구 확인
2. 전화 아이콘 클릭하여 직접 통화 요청
3. 친구가 수락하면 영상 통화 시작

**시나리오 4: AI 콘텐츠 모더레이션**
1. 영상 통화 중 부적절한 콘텐츠 테스트 (사전에 허가받은 테스터만)
2. 경고 알림 확인
3. 강제 종료 확인

## 3. 초기 버그 및 수정

### 3.1 로그아웃 시 앱 크래시

**버그**: 로그아웃 버튼 클릭 시 앱이 크래시되는 문제.

**원인**: React Query mutation이 완료되기 전에 navigation이 실행되어 컴포넌트가 언마운트됨.

**수정 전**:
```typescript
const logout = () => {
  logoutMutation.mutate(undefined, {
    onSuccess: () => {
      authStore.logout();
      navigation.navigate('Login');
    },
  });
};
```

**수정 후**:
```typescript
const logout = () => {
  // mutation 없이 직접 로그아웃
  authStore.logout();

  // requestAnimationFrame으로 다음 프레임에 navigation 실행
  requestAnimationFrame(() => {
    navigation.navigate('Login');
  });
};
```

**왜 requestAnimationFrame?**
- 현재 렌더링 사이클이 끝난 후 navigation 실행
- React의 상태 업데이트와 충돌 방지
- 부드러운 화면 전환

찾아봤더니 React Native에서 navigation과 상태 변경이 동시에 일어날 때 `requestAnimationFrame`을 사용하면 안정적이라고 한다.

### 3.2 Android Emulator에서 영상 통화 실패

**버그**: Android 에뮬레이터에서 영상 통화 시작 시 검은 화면만 표시됨.

**원인**: 에뮬레이터에 카메라가 없어서 Agora SDK가 영상 스트림을 생성하지 못함.

**해결**: 실제 Android 기기로 테스트하거나, AVD Manager에서 가상 카메라 활성화.

**AVD 카메라 설정**:
1. Android Studio → AVD Manager
2. 에뮬레이터 Edit
3. **Webcam (Front Camera)**: Emulated 선택
4. **Webcam (Back Camera)**: Emulated 선택

### 3.3 친구 온라인 상태가 업데이트되지 않음

**버그**: 친구가 로그인해도 온라인 상태로 바뀌지 않음.

**원인**: Socket.io 이벤트 리스너가 중복 등록되어 이전 상태로 덮어써짐.

**수정 전**:
```typescript
useEffect(() => {
  socket.on('friend:status-changed', (data) => {
    // 상태 업데이트
  });
}, []); // 클린업 없음
```

**수정 후**:
```typescript
useEffect(() => {
  const handleStatusChanged = (data) => {
    queryClient.setQueryData(/* ... */);
  };

  socket.on('friend:status-changed', handleStatusChanged);

  return () => {
    socket.off('friend:status-changed', handleStatusChanged);
  };
}, [socket, queryClient]);
```

**Socket.io 이벤트 클린업이 중요한 이유**:
- 컴포넌트가 다시 렌더링될 때마다 새 리스너 추가
- 이전 리스너가 제거되지 않으면 중복 실행
- `socket.off`로 명시적 제거 필요

## 4. 사용자 피드백 수집

### 4.1 피드백 채널

Google Forms로 피드백 설문을 만들었다.

**질문 항목**:
1. 회원가입 과정이 어려웠나요? (1-5점)
2. 매칭 대기 시간이 적절했나요? (1-5점)
3. 영상 통화 품질이 만족스러웠나요? (1-5점)
4. 가장 개선이 필요한 기능은?
5. 기타 의견

### 4.2 주요 피드백

**긍정적 피드백**:
- "텍스트 없이 바로 영상으로 만나니 빠르고 좋다"
- "5분 제한이 부담 없어서 좋다"
- "AI 모더레이션 덕분에 안전하다고 느껴진다"

**개선 요청**:
1. **매칭 대기 시간 표시**: 현재 몇 명이 대기 중인지 알 수 없음
2. **통화 품질 표시**: 네트워크 상태 인디케이터 필요
3. **프로필 사진 확대**: 친구 목록에서 사진을 크게 볼 수 없음
4. **오프라인 친구 숨기기**: 온라인 친구만 필터링하는 옵션

## 5. 피드백 반영 및 개선

### 5.1 매칭 대기 인원 표시

**요청**: "몇 명이 매칭 대기 중인지 보고 싶어요"

**구현**:
```typescript
// backend/src/sockets/match-handler.ts
export const getWaitingCount = (): number => {
  return waitingQueue.size;
};

// Socket.io로 주기적으로 전송
setInterval(() => {
  io.emit('match:waiting-count', {
    count: getWaitingCount(),
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

### 5.2 통화 품질 표시

**요청**: "네트워크가 느린지 빠른지 알 수 없어요"

Agora SDK의 `onNetworkQuality` 이벤트를 사용하여 구현했다.

```typescript
// mobile/src/screens/call/VideoCallScreen.tsx
const [networkQuality, setNetworkQuality] = useState<number>(0);

agoraEngine.registerEventHandler({
  onNetworkQuality: (connection, uid, txQuality, rxQuality) => {
    if (uid === localUid) {
      setNetworkQuality(txQuality); // 1: 좋음, 2: 보통, 3: 나쁨
    }
  },
});

const getQualityColor = (quality: number) => {
  if (quality <= 2) return colors.success; // 좋음
  if (quality <= 4) return colors.warning; // 보통
  return colors.error; // 나쁨
};

return (
  <View style={styles.qualityIndicator}>
    <Icon
      name="signal-cellular-alt"
      size={20}
      color={getQualityColor(networkQuality)}
    />
  </View>
);
```

### 5.3 온라인 친구만 보기 필터

**요청**: "오프라인 친구가 많아서 온라인 친구를 찾기 어려워요"

```typescript
// mobile/src/screens/friends/FriendsScreen.tsx
const [showOnlineOnly, setShowOnlineOnly] = useState(false);

const filteredFriends = useMemo(() => {
  if (showOnlineOnly) {
    return friends.filter(f => f.onlineStatus === 'ONLINE');
  }
  return friends;
}, [friends, showOnlineOnly]);

return (
  <>
    <Switch
      value={showOnlineOnly}
      onValueChange={setShowOnlineOnly}
    />
    <Text>온라인만 표시</Text>
    <FlatList data={filteredFriends} />
  </>
);
```

## 6. 사용 통계 분석

### 6.1 실제 사용량 (Beta 2주차)

Render 관리자 대시보드에서 확인한 통계:

| 항목 | 예상 | 실제 | 비율 |
|------|------|------|------|
| 가입자 수 | 20명 | 18명 | 90% |
| 일 평균 활성 사용자 | 10명 | 12명 | 120% |
| 일 평균 통화 시간 | 100분 | 145분 | 145% |
| 월 총 통화 시간 | 3,000분 | ~4,060분 | 135% |
| Agora 사용량 | 3,000분/10,000분 | 4,060분/10,000분 | 40.6% |

**결과**: 여전히 무료 한도 내에서 운영 중!

### 6.2 AI 모더레이션 통계

- **총 통화 세션**: 312건
- **AI 분석 프레임**: 23,400장 (세션당 평균 75장)
- **경고 발생**: 3건 (1.0%)
- **강제 종료**: 0건
- **Hugging Face 사용량**: 23,400건/30,000건 (78%)

AI 모더레이션이 예상보다 잘 작동했다. 대부분의 통화는 정상이었고, 경고도 극소수였다.

## 7. 성능 최적화

### 7.1 Render Cold Start 개선

GitHub Actions keep-alive를 활성화했지만, 가끔 서버가 sleep되는 경우가 있었다.

**개선**:
```yaml
# .github/workflows/keep-alive.yml
# 5분마다 → 3분마다로 변경 (더 자주 ping)
- cron: '*/3 * * * *'
```

하지만 GitHub Actions는 최소 5분 간격만 지원한다는 걸 알게 됐다. 대신 **두 개의 엔드포인트를 ping**하도록 수정했다.

```yaml
- name: Ping Multiple Endpoints
  run: |
    curl https://beyond-meet-api.onrender.com/health
    curl https://beyond-meet-api.onrender.com/api/auth/health
```

### 7.2 React Query Stale Time 조정

친구 목록이 너무 자주 재조회되어 불필요한 네트워크 요청이 발생했다.

**수정 전**:
```typescript
const { data: friends } = useFriends(userId);
// staleTime 기본값: 0 (항상 stale)
```

**수정 후**:
```typescript
const { data: friends } = useQuery({
  queryKey: friendsKeys.list(userId),
  queryFn: () => friendsApi.getFriends(),
  staleTime: 5 * 60 * 1000, // 5분
  gcTime: 10 * 60 * 1000, // 10분 (이전 cacheTime)
});
```

**staleTime vs gcTime**:
- `staleTime`: 데이터가 "신선"하다고 간주되는 시간 (재조회하지 않음)
- `gcTime`: 캐시에서 삭제되기까지의 시간 (garbage collection)

찾아봤더니 React Query v5에서 `cacheTime`이 `gcTime`으로 이름이 변경됐다고 한다.

## 8. 보안 개선

### 8.1 Rate Limiting 강화

베타 테스트 중 한 사용자가 실수로 매칭 버튼을 연타하여 서버에 부하를 주었다.

**개선**:
```typescript
// backend/src/middlewares/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const matchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 3, // 최대 3회
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: '매칭 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    },
  },
});

// 적용
router.post('/match/request', authenticate, matchLimiter, matchController.requestMatch);
```

### 8.2 JWT 토큰 만료 시간 단축

보안 강화를 위해 Access Token 만료 시간을 단축했다.

**변경**:
- Access Token: 24시간 → **1시간**
- Refresh Token: 30일 → **7일**

모바일 앱에서는 토큰 갱신이 자동으로 이루어지므로 사용자 경험에 영향 없음.

## 9. 트러블슈팅

### 9.1 iOS TestFlight 빌드 실패

**문제**: Xcode에서 Archive 빌드 시 서명 에러.

**에러**:
```
error: Provisioning profile "[PROFILE]" doesn't include signing certificate
```

**해결**:
1. Apple Developer → Certificates → 기존 인증서 삭제
2. 새 Distribution Certificate 생성
3. Provisioning Profile 재생성
4. Xcode → Preferences → Accounts → Download Manual Profiles

### 9.2 Supabase Storage 업로드 느림

**문제**: 프로필 사진 업로드가 5초 이상 소요됨.

**원인**: 원본 이미지가 5-10MB로 큰 용량.

**해결**: react-native-image-picker의 `quality` 옵션으로 압축.

```typescript
launchImageLibrary({
  mediaType: 'photo',
  quality: 0.7, // 0.8 → 0.7로 변경 (더 압축)
  maxWidth: 1024,
  maxHeight: 1024,
});
```

압축 후 평균 파일 크기: 500KB → 업로드 시간 1-2초로 단축.

## 10. 정리 및 회고

### 10.1 Beta 테스트 성과

**정량적 성과**:
- 가입률: 90% (18명/20명)
- 일 평균 활성 사용자: 12명
- 평균 만족도: 4.2/5.0
- 월 운영 비용: **$0**

**정성적 성과**:
- 실제 사용자 피드백으로 UX 개선
- 버그 조기 발견 및 수정
- AI 모더레이션 효과 검증

### 10.2 배운 점

1. **무료 인프라 조합의 가능성**: Render, Supabase, Agora, Firebase 등을 조합하면 실제 서비스를 $0/월로 운영 가능
2. **사용자 피드백의 중요성**: 예상하지 못한 사용 패턴 발견 (예: 온라인 친구만 보기 필터)
3. **베타 테스트 제한의 효과**: 소수 인원으로 집중 관리하여 높은 품질의 피드백 수집
4. **React Query의 강력함**: staleTime, gcTime 조정만으로 성능 크게 개선

### 10.3 향후 계획

**정식 출시 전 개선사항**:
1. 통화 품질 향상 (네트워크 안정성)
2. 이미지 캐싱 최적화
3. 개인정보처리방침/이용약관 법률 검토
4. 비밀번호 재설정 이메일 발송 구현

**정식 출시 후**:
1. 사용자 수 확대 (50명 → 100명 → 500명)
2. 유료 인프라 전환 검토 (Agora 한도 초과 시)
3. 앱스토어/플레이스토어 정식 출시
4. 마케팅 및 홍보

## 마무리

Beyond Meet 프로젝트를 처음부터 끝까지 구현하면서 많은 것을 배웠다. JWT 인증부터 WebRTC 영상 통화, AI 콘텐츠 모더레이션, 무료 배포까지 실제 서비스를 만드는 전 과정을 경험했다.

특히 **무료 인프라만으로 실제 서비스를 운영**할 수 있다는 것을 증명한 것이 가장 뿌듯하다. 베타 테스트를 통해 사용자들의 긍정적인 피드백을 받았고, 앞으로 더 많은 사람들이 Beyond Meet을 사용하기를 기대한다.

이 시리즈를 통해 누군가에게 도움이 되었으면 좋겠다. 감사합니다!
