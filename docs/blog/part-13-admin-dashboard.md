# 영상 데이팅 앱 만들기 #13 - 관리자 대시보드 구현

> **이전 글 요약**: Part 12에서 친구 시스템과 직접 통화 기능을 구현했다. 단방향 친구 관계로 설계하고, Socket.io로 실시간 온라인 상태를 동기화했다.

Beta 서비스를 운영하다 보니 **모니터링**이 필요해졌다. AI 콘텐츠 모더레이션이 제대로 작동하는지, 신고가 들어왔을 때 어떻게 처리할지 등을 확인할 수 있는 관리자 대시보드가 필요했다.

---

## 관리자 기능 구현 방식 결정

관리자 기능을 어떻게 구현할지 두 가지 방식을 고민했다.

1. **별도의 관리자 웹 페이지**: React/Next.js로 별도 관리자 사이트 구축
2. **모바일 앱 내 관리자 화면**: 기존 React Native 앱에 관리자 전용 화면 추가

Beyond Meet은 **모바일 앱 내 관리자 화면** 방식을 선택했다. Beta 서비스라 관리자 수가 적고(1-2명), 별도 웹 페이지를 구축하는 비용이 아까웠다. 모바일에서 빠르게 확인하고 대응할 수 있는 것도 장점이었다.

---

## 관리자 권한 시스템 설계

### 듀얼 체크 방식

관리자 권한을 확인하는 방법을 고민했다. 처음에는 환경 변수에 관리자 이메일 목록만 사용했는데, 나중에 DB Role을 추가하면서 **듀얼 체크 방식**으로 변경했다.

```typescript
// backend/src/middlewares/admin.ts
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

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

듀얼 체크를 사용한 이유가 있다. 기존 환경 변수 방식도 계속 지원해서 기존 관리자가 즉시 로그아웃되지 않도록 했다. DB Role로 점진적으로 이전할 수 있고, DB 문제가 발생해도 환경 변수로 관리자 접근이 가능하다.

---

## 관리자 통계 API 구현

### 병렬 쿼리로 성능 최적화

관리자 대시보드에서 가장 먼저 보이는 것은 **서비스 통계**다. 전체 사용자 수, 활성 사용자 수, 온라인 사용자 수, 총 통화 수 등을 조회한다.

처음에는 순차적으로 쿼리를 실행했는데, `Promise.all`로 병렬 처리하면서 성능이 크게 향상됐다.

```typescript
// backend/src/services/admin-service.ts
export const getStats = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 모든 쿼리를 병렬로 실행하여 성능 향상
  const [totalUsers, activeUsers, onlineUsers, callStats, todayCalls] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { lastActive: { gte: sevenDaysAgo } },
    }),
    prisma.user.count({
      where: { onlineStatus: { in: ['ONLINE', 'IN_CALL'] } },
    }),
    prisma.callRecord.aggregate({
      where: { status: 'COMPLETED', duration: { not: null } },
      _count: { id: true },
      _sum: { duration: true },
    }),
    prisma.callRecord.count({
      where: { createdAt: { gte: today } },
    }),
  ]);

  const totalCallMinutes = Math.floor((callStats._sum.duration || 0) / 60);

  return {
    users: { total: totalUsers, active: activeUsers, online: onlineUsers },
    calls: { total: callStats._count.id, today: todayCalls, totalMinutes: totalCallMinutes },
  };
};
```

5개 쿼리를 동시에 실행하면서 순차 처리(~500ms) 대비 병렬 처리(~100ms)로 약 5배 빨라졌다. Prisma의 `aggregate` 함수로 COUNT와 SUM을 한 번에 처리할 수 있다는 것도 알게 됐다.

---

## 모니터링 로그 조회 (페이지네이션)

AI 콘텐츠 모더레이션 로그는 시간이 지나면 수천 개가 쌓일 수 있다. 모든 데이터를 한 번에 조회하면 성능 문제가 발생하므로 **페이지네이션**을 구현했다.

```typescript
// backend/src/controllers/admin-controller.ts
export const getModerationLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, actionTaken } = req.query;

    const validActionTaken = actionTaken &&
      ['NONE', 'WARNING_ISSUED', 'CALL_ENDED'].includes(actionTaken as string)
      ? (actionTaken as ModerationAction)
      : undefined;

    const logs = await prisma.contentModerationLog.findMany({
      where: validActionTaken ? { actionTaken: validActionTaken } : undefined,
      include: {
        user: { select: { id: true, nickname: true, email: true } },
        session: { select: { id: true, channelName: true } },
      },
      orderBy: { detectedAt: 'desc' },
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
        pagination: { page: Number(page), limit: Number(limit), total },
      },
    });
  } catch (error) {
    next(error);
  }
};
```

`skip`과 `take`로 페이지네이션을 구현했다. `skip`은 `(page - 1) * limit`으로 건너뛸 레코드 수를 계산하고, `take`는 가져올 레코드 수다. `total`은 전체 레코드 수로 총 페이지 계산에 사용한다.

---

## React Native 무한 스크롤 구현

### useInfiniteQuery 활용

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
      return hasMore ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
};
```

`getNextPageParam`에서 다음 페이지 번호를 계산하고, 더 이상 페이지가 없으면 `undefined`를 반환한다. `undefined`를 반환하면 `hasNextPage`가 `false`가 된다.

### FlatList와 연동

```typescript
// mobile/src/screens/admin/ModerationLogsScreen.tsx
const ModerationLogsScreen = () => {
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
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
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator /> : null
      }
    />
  );
};
```

`data.pages.flatMap()`으로 모든 페이지의 데이터를 하나의 배열로 합치고, `onEndReachedThreshold`를 0.5로 설정해서 리스트의 50% 지점에서 다음 페이지 로드를 시작한다. 사용자가 끝까지 스크롤하기 전에 미리 데이터를 로드해서 부드러운 경험을 제공한다.

---

## 필터 UI 구현

모니터링 로그를 **조치 유형별로 필터링**할 수 있도록 했다. 전체 로그, 경고만(WARNING_ISSUED), 강제 종료만(CALL_ENDED)으로 분류할 수 있다.

```typescript
const renderFilter = () => (
  <View style={styles.filterContainer}>
    <TouchableOpacity
      style={[styles.filterButton, !filter && styles.filterButtonActive]}
      onPress={() => setFilter(undefined)}
    >
      <Text style={[styles.filterText, !filter && styles.filterTextActive]}>전체</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.filterButton, filter === 'WARNING_ISSUED' && styles.filterButtonActive]}
      onPress={() => setFilter('WARNING_ISSUED')}
    >
      <Text style={[styles.filterText, filter === 'WARNING_ISSUED' && styles.filterTextActive]}>경고</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.filterButton, filter === 'CALL_ENDED' && styles.filterButtonActive]}
      onPress={() => setFilter('CALL_ENDED')}
    >
      <Text style={[styles.filterText, filter === 'CALL_ENDED' && styles.filterTextActive]}>강제종료</Text>
    </TouchableOpacity>
  </View>
);
```

`filter` state가 변경되면 `useModerationLogs(filter)`의 `queryKey`가 변경되고, React Query가 자동으로 새 쿼리를 실행한다. 이게 React Query의 큰 장점이다.

---

## 겪었던 문제들

### 무한 스크롤이 중복 로드됨

스크롤을 내릴 때 같은 페이지가 여러 번 로드되는 문제가 있었다. `onEndReached`가 여러 번 호출되기 때문이었다.

```typescript
const loadMore = useCallback(() => {
  if (hasNextPage && !isFetchingNextPage) { // isFetchingNextPage 체크 추가
    fetchNextPage();
  }
}, [hasNextPage, isFetchingNextPage, fetchNextPage]);
```

`isFetchingNextPage`로 이미 로딩 중이면 중복 호출을 막아서 해결했다.

### 필터 변경 시 스크롤 위치 유지

필터를 변경하면 스크롤이 맨 위로 이동하지 않는 문제가 있었다. FlatList가 데이터만 바뀌어도 스크롤 위치를 유지하기 때문이다.

```typescript
const flatListRef = useRef<FlatList>(null);

const handleFilterChange = (newFilter: string | undefined) => {
  setFilter(newFilter);
  flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
};
```

필터 변경 시 `scrollToOffset`으로 맨 위로 스크롤하도록 했다.

### 관리자 화면 접근 제어

일반 사용자가 관리자 화면에 접근하려고 시도할 수 있다. 프론트엔드에서 조건부 렌더링으로 UI를 숨기고, 백엔드 `requireAdmin` 미들웨어가 실제 보안 검증을 담당하도록 이중 보호를 적용했다.

---

## 다음 글 예고

**Part 14: Render.com 배포**

다음 글에서는 백엔드를 Render.com에 배포하는 과정을 다룬다. 환경 변수 설정, 자동 배포 연동 등을 다룰 예정이다.

---

## 마치며

관리자 대시보드를 구현하면서 몇 가지 배운 점이 있다.

`Promise.all`로 병렬 쿼리를 실행하면 성능이 크게 향상된다. 독립적인 쿼리들을 순차 실행할 이유가 없다.

React Query의 `useInfiniteQuery`가 무한 스크롤 구현에 편리했다. `getNextPageParam`으로 다음 페이지 로직을 선언적으로 정의할 수 있었다.

필터 변경 시 queryKey가 바뀌면서 자동으로 재조회되는 것도 React Query의 장점이었다. 상태 관리를 직접 할 필요가 없어서 코드가 간결해졌다.

---

**태그**: `관리자 대시보드` `React Query` `useInfiniteQuery` `페이지네이션` `무한 스크롤`
