# Part 13: 관리자 대시보드 구현

## 1. 관리자 기능의 필요성

베타 서비스를 운영하다 보니 **모니터링**이 필요했다. AI 콘텐츠 모더레이션이 제대로 작동하는지, 신고가 들어왔을 때 어떻게 처리할지 등을 확인할 수 있는 관리자 대시보드가 필요했다.

검색해보니 관리자 기능은 크게 두 가지 방식으로 구현할 수 있었다:

1. **별도의 관리자 웹 페이지**: React/Next.js로 별도 관리자 사이트 구축
2. **모바일 앱 내 관리자 화면**: 기존 React Native 앱에 관리자 전용 화면 추가

Beyond Meet은 **모바일 앱 내 관리자 화면** 방식을 선택했다. 이유는:
- 베타 서비스라 관리자 수가 적음 (1-2명)
- 별도 웹 페이지 구축 비용이 크다
- 모바일에서 빠르게 확인하고 대응할 수 있음

## 2. 관리자 권한 시스템 설계

### 2.1 듀얼 체크 방식 (DB Role + Email Fallback)

관리자 권한을 확인하는 방법도 두 가지가 있었다:

1. **환경 변수 이메일 목록**: `ADMIN_EMAILS`에 관리자 이메일 등록
2. **DB Role 필드**: User 모델에 `role` 필드 추가 (`USER` | `ADMIN`)

처음에는 환경 변수만 사용했지만, 나중에 DB Role을 추가하면서 **듀얼 체크 방식**으로 변경했다.

```typescript
// backend/src/middlewares/admin.ts
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user?.email) {
    throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
  }

  // Primary: Database role check
  const hasAdminRole = user.role === 'ADMIN';

  // Fallback: Email check (backward compatibility)
  const hasAdminEmail = ADMIN_EMAILS.includes(user.email);

  if (!hasAdminRole && !hasAdminEmail) {
    throw new AppError(403, 'FORBIDDEN', '관리자 권한이 필요합니다');
  }

  // Log migration status for monitoring
  if (hasAdminEmail && !hasAdminRole) {
    console.warn(`[Admin Auth] ${user.email} using legacy auth (email-based).`);
  }

  next();
};
```

**듀얼 체크를 사용한 이유**:
- **Backward Compatibility**: 기존 환경 변수 방식도 계속 지원하여 기존 관리자가 즉시 로그아웃되지 않도록 함
- **Migration Path**: DB Role로 점진적 이전 가능
- **Fallback Safety**: DB 문제 발생 시에도 환경 변수로 관리자 접근 가능

## 3. 관리자 통계 API 구현

### 3.1 병렬 쿼리로 성능 최적화

관리자 대시보드에서 가장 먼저 보이는 것은 **서비스 통계**다. 전체 사용자 수, 활성 사용자 수, 온라인 사용자 수, 총 통화 수 등을 조회한다.

처음에는 순차적으로 쿼리를 실행했다가, `Promise.all`로 병렬 처리하여 성능을 크게 향상시켰다.

```typescript
// backend/src/services/admin-service.ts
export const getStats = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 모든 쿼리를 병렬로 실행하여 성능 향상
  const [totalUsers, activeUsers, onlineUsers, callStats, todayCalls] = await Promise.all([
    // 전체 사용자 수
    prisma.user.count(),

    // 활성 사용자 수 (최근 7일 이내 활동)
    prisma.user.count({
      where: {
        lastActive: { gte: sevenDaysAgo },
      },
    }),

    // 온라인 사용자 수
    prisma.user.count({
      where: {
        onlineStatus: { in: ['ONLINE', 'IN_CALL'] },
      },
    }),

    // 총 통화 수 + 총 통화 시간 (aggregate로 한번에)
    prisma.callRecord.aggregate({
      where: {
        status: 'COMPLETED',
        duration: { not: null },
      },
      _count: { id: true },
      _sum: { duration: true },
    }),

    // 오늘의 통화 수
    prisma.callRecord.count({
      where: {
        createdAt: { gte: today },
      },
    }),
  ]);

  const totalCallMinutes = Math.floor((callStats._sum.duration || 0) / 60);
  const betaLimit = parseInt(process.env.BETA_USER_LIMIT || '30', 10);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      online: onlineUsers,
      betaLimit,
    },
    calls: {
      total: callStats._count.id,
      today: todayCalls,
      totalMinutes: totalCallMinutes,
    },
  };
};
```

**최적화 포인트**:
1. **Promise.all 병렬 처리**: 5개 쿼리를 동시에 실행하여 약 5배 빠름 (순차: ~500ms → 병렬: ~100ms)
2. **aggregate 사용**: `_count`와 `_sum`을 한 번의 쿼리로 처리
3. **인덱스 활용**: `lastActive`, `onlineStatus`, `createdAt`에 인덱스가 있어 빠른 검색

찾아봤더니 Prisma의 `aggregate` 함수가 COUNT와 SUM을 한 번에 처리할 수 있었다. 이걸 몰랐을 때는 두 번 쿼리를 날렸었다.

## 4. 모니터링 로그 조회 (Pagination)

### 4.1 페이지네이션 구현

AI 콘텐츠 모더레이션 로그는 시간이 지나면 수천 개가 쌓일 수 있다. 모든 데이터를 한 번에 조회하면 성능 문제가 발생하므로 **페이지네이션**을 구현했다.

```typescript
// backend/src/controllers/admin-controller.ts
export const getModerationLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 20, actionTaken } = req.query;

    const prisma = (await import('../config/database')).default;

    // actionTaken이 유효한 ModerationAction인지 확인
    const validActionTaken = actionTaken &&
      ['NONE', 'WARNING_ISSUED', 'CALL_ENDED'].includes(actionTaken as string)
      ? (actionTaken as ModerationAction)
      : undefined;

    const logs = await prisma.contentModerationLog.findMany({
      where: validActionTaken ? { actionTaken: validActionTaken } : undefined,
      include: {
        user: {
          select: { id: true, nickname: true, email: true },
        },
        session: {
          select: { id: true, channelName: true },
        },
      },
      orderBy: { detectedAt: 'desc' }, // 최신 순
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.contentModerationLog.count({
      where: validActionTaken ? { actionTaken: validActionTaken } : undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
```

**페이지네이션 구현 포인트**:
- `skip`: `(page - 1) * limit` → 건너뛸 레코드 수
- `take`: `limit` → 가져올 레코드 수
- `total`: 전체 레코드 수 (총 페이지 계산용)

### 4.2 필터링 기능

모니터링 로그를 **조치 유형별로 필터링**할 수 있다:
- 전체 로그
- `WARNING_ISSUED` (경고만)
- `CALL_ENDED` (강제 종료만)

```typescript
const validActionTaken = actionTaken &&
  ['NONE', 'WARNING_ISSUED', 'CALL_ENDED'].includes(actionTaken as string)
  ? (actionTaken as ModerationAction)
  : undefined;

const logs = await prisma.contentModerationLog.findMany({
  where: validActionTaken ? { actionTaken: validActionTaken } : undefined,
  // ...
});
```

이 방식으로 필터가 없으면 모든 로그를 조회하고, 필터가 있으면 해당 조치만 조회한다.

## 5. React Native 무한 스크롤 구현

### 5.1 React Query Infinite Query

모바일 앱에서 페이지네이션을 구현할 때 **무한 스크롤** 방식을 사용했다. React Query의 `useInfiniteQuery`를 활용했다.

```typescript
// mobile/src/hooks/useAdmin.ts
export const useModerationLogs = (actionTaken?: string) => {
  return useInfiniteQuery({
    queryKey: adminKeys.moderationLogs(actionTaken),
    queryFn: ({ pageParam = 1 }) =>
      adminApi.getModerationLogs({
        page: pageParam,
        limit: 20,
        actionTaken,
      }),
    getNextPageParam: (lastPage) => {
      const { page, limit, total } = lastPage.pagination;
      const hasMore = page * limit < total;
      return hasMore ? page + 1 : undefined; // undefined면 더 이상 페이지 없음
    },
    initialPageParam: 1,
  });
};
```

**useInfiniteQuery 작동 원리**:
1. `queryFn`: 페이지 번호(`pageParam`)를 받아서 데이터 조회
2. `getNextPageParam`: 다음 페이지 번호 계산 (없으면 `undefined` 반환)
3. `fetchNextPage()`: 다음 페이지 데이터 추가 로드

### 5.2 FlatList와 연동

```typescript
// mobile/src/screens/admin/ModerationLogsScreen.tsx
const ModerationLogsScreen: React.FC = () => {
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useModerationLogs(filter);

  // 모든 페이지의 logs를 flat하게 합침
  const logs = data?.pages.flatMap((page) => page.logs) ?? [];

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <FlatList
      data={logs}
      renderItem={renderItem}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5} // 50% 지점에서 다음 페이지 로드
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator /> : null
      }
    />
  );
};
```

**무한 스크롤 구현 포인트**:
1. `data.pages.flatMap()`: 모든 페이지의 데이터를 하나의 배열로 합침
2. `onEndReached`: 스크롤이 끝에 도달하면 `loadMore` 호출
3. `onEndReachedThreshold`: 0.5면 리스트의 50% 지점에서 다음 페이지 로드 시작

찾아봤더니 `onEndReachedThreshold`를 0.5로 설정하면 사용자가 끝까지 스크롤하기 전에 미리 데이터를 로드하여 부드러운 경험을 제공할 수 있었다.

## 6. 필터 UI 구현

### 6.1 필터 버튼

모니터링 로그 화면 상단에 필터 버튼을 배치했다.

```typescript
const renderFilter = () => (
  <View style={styles.filterContainer}>
    <TouchableOpacity
      style={[styles.filterButton, !filter && styles.filterButtonActive]}
      onPress={() => setFilter(undefined)}
    >
      <Text style={[styles.filterText, !filter && styles.filterTextActive]}>
        전체
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === 'WARNING_ISSUED' && styles.filterButtonActive,
      ]}
      onPress={() => setFilter('WARNING_ISSUED')}
    >
      <Text
        style={[
          styles.filterText,
          filter === 'WARNING_ISSUED' && styles.filterTextActive,
        ]}
      >
        경고
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === 'CALL_ENDED' && styles.filterButtonActive,
      ]}
      onPress={() => setFilter('CALL_ENDED')}
    >
      <Text
        style={[
          styles.filterText,
          filter === 'CALL_ENDED' && styles.filterTextActive,
        ]}
      >
        강제종료
      </Text>
    </TouchableOpacity>
  </View>
);
```

**필터 변경 시 자동 재조회**:
- `filter` state가 변경되면 `useModerationLogs(filter)`의 `queryKey`가 변경됨
- React Query가 자동으로 새 쿼리 실행

이게 React Query의 큰 장점이다. queryKey가 바뀌면 자동으로 재조회해준다.

## 7. 로그 아이템 렌더링

### 7.1 조치별 색상 구분

로그를 보기 쉽게 **조치 유형별로 색상**을 다르게 표시했다.

```typescript
const getActionColor = (action: string) => {
  switch (action) {
    case 'CALL_ENDED':
      return colors.error; // 빨강
    case 'WARNING_ISSUED':
      return colors.warning; // 주황
    default:
      return colors.textSecondary; // 회색
  }
};

const getActionText = (action: string) => {
  switch (action) {
    case 'CALL_ENDED':
      return '통화 강제 종료';
    case 'WARNING_ISSUED':
      return '경고 발송';
    case 'NONE':
      return '조치 없음';
    default:
      return action;
  }
};

const renderItem = ({ item }: { item: ModerationLog }) => {
  return (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <Text style={styles.userName}>
          {item.user.nickname || item.user.email}
        </Text>
        <Text
          style={[
            styles.actionBadge,
            { backgroundColor: getActionColor(item.actionTaken) + '20' },
          ]}
        >
          <Text style={{ color: getActionColor(item.actionTaken) }}>
            {getActionText(item.actionTaken)}
          </Text>
        </Text>
      </View>

      <View style={styles.logDetails}>
        <Text style={styles.detailText}>
          신뢰도: {(item.confidence * 100).toFixed(1)}%
        </Text>
        <Text style={styles.detailText}>세션: {item.session.channelName}</Text>
      </View>

      <Text style={styles.dateText}>{formattedDate}</Text>
    </View>
  );
};
```

**UI 개선 포인트**:
- `CALL_ENDED`는 빨간색 배지 → 즉시 눈에 띔
- `WARNING_ISSUED`는 주황색 배지 → 주의 필요
- 신뢰도를 퍼센트로 표시하여 이해하기 쉽게 함

## 8. 관리자 화면 접근 제어

### 8.1 조건부 Navigation

일반 사용자에게는 관리자 화면이 보이지 않도록 **조건부 렌더링**을 구현했다.

```typescript
// mobile/src/navigation/RootNavigator.tsx
const RootNavigator = () => {
  const { data: user } = useMyProfile();

  return (
    <Stack.Navigator>
      {/* 일반 화면들 */}
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />

      {/* 관리자 화면 (조건부) */}
      {user?.role === 'ADMIN' && (
        <Stack.Screen name="Admin" component={AdminNavigator} />
      )}
    </Stack.Navigator>
  );
};
```

**보안 고려사항**:
- 프론트엔드 조건부 렌더링은 UI만 숨김
- **백엔드 `requireAdmin` 미들웨어가 실제 보안 검증**
- 프론트엔드 체크는 UX 향상용

## 9. 테스트 및 검증

### 9.1 통계 조회 성능 테스트

1. **순차 쿼리**: 5개 쿼리를 순차 실행 → 약 500ms
2. **병렬 쿼리 (`Promise.all`)**: 5개 쿼리를 동시 실행 → 약 100ms

병렬 처리로 **5배 성능 향상**을 달성했다.

### 9.2 무한 스크롤 테스트

1. **100개 로그 생성**: DB에 테스트 데이터 삽입
2. **첫 페이지 로드**: 20개 로드됨
3. **스크롤 다운**: 50% 지점에서 자동으로 다음 20개 로드
4. **5번 스크롤**: 총 100개 모두 로드됨 (5 페이지)

### 9.3 필터링 성능 테스트

- **전체 조회**: 100개 중 100개 반환 (~50ms)
- **WARNING_ISSUED 필터**: 100개 중 30개 반환 (~20ms)
- **CALL_ENDED 필터**: 100개 중 10개 반환 (~15ms)

필터를 적용하면 `WHERE` 절로 데이터가 줄어들어 더 빠르다.

## 10. 트러블슈팅

### 10.1 무한 스크롤이 중복 로드됨

**문제**: 스크롤을 내릴 때 같은 페이지가 여러 번 로드됨.

**원인**: `onEndReached`가 여러 번 호출되는 문제.

**해결**:
```typescript
const loadMore = useCallback(() => {
  if (hasNextPage && !isFetchingNextPage) { // isFetchingNextPage 체크 추가
    fetchNextPage();
  }
}, [hasNextPage, isFetchingNextPage, fetchNextPage]);
```

`isFetchingNextPage`로 이미 로딩 중이면 중복 호출을 막는다.

### 10.2 필터 변경 시 스크롤 위치 유지

**문제**: 필터를 변경하면 스크롤이 맨 위로 이동하지 않음.

**원인**: FlatList가 데이터만 바뀌어도 스크롤 위치를 유지함.

**해결**:
```typescript
const flatListRef = useRef<FlatList>(null);

const handleFilterChange = (newFilter: string | undefined) => {
  setFilter(newFilter);
  flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
};
```

필터 변경 시 `scrollToOffset`으로 맨 위로 스크롤.

### 10.3 관리자 권한이 없는데 Admin 화면이 보임

**문제**: 일반 사용자가 URL 직접 입력으로 Admin 화면 접근 시도.

**원인**: React Navigation의 `navigate('Admin')` 호출 가능.

**해결**:
```typescript
// Admin 화면 진입 시 권한 체크
const AdminScreen = () => {
  const { data: user } = useMyProfile();

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      Alert.alert('권한 없음', '관리자만 접근 가능합니다.');
      navigation.goBack();
    }
  }, [user]);

  // ...
};
```

프론트엔드 체크 + 백엔드 `requireAdmin` 미들웨어로 이중 보호.

## 11. 정리

관리자 대시보드를 구현했다. 주요 구현 내용:

1. **듀얼 체크 권한 시스템**: DB Role + 환경 변수 이메일 Fallback
2. **병렬 쿼리 최적화**: `Promise.all`로 통계 조회 5배 빠르게
3. **페이지네이션**: `skip`/`take`로 대량 데이터 효율적 처리
4. **무한 스크롤**: React Query `useInfiniteQuery` + FlatList `onEndReached`
5. **필터링**: 조치 유형별 로그 분류
6. **조건부 렌더링**: 관리자만 Admin 화면 접근 가능

다음 Part에서는 **배포 및 CI/CD** 설정을 다루겠다.
