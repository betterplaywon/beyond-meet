# 영상 데이팅 앱 만들기 #6 - React Native 인증 UI와 상태 관리

> **이전 글 요약**: Part 5에서 백엔드에 JWT 기반 인증 시스템을 구축했다. bcrypt로 비밀번호를 해싱하고, Zod로 입력을 검증하며, Serializable 트랜잭션으로 Race Condition을 방지했다.

백엔드 인증 시스템이 완성됐으니 이제 모바일 앱에서 이를 활용할 차례다. 프론트엔드 개발자로서 이 부분은 상대적으로 익숙한 영역이었지만, 모바일 앱 특유의 고려사항들이 있었다. 토큰을 어디에 저장할지, 앱을 껐다 켜도 로그인이 유지되게 하려면 어떻게 해야 하는지, 토큰이 만료됐을 때 사용자가 다시 로그인하지 않아도 되게 하려면 어떻게 해야 하는지... 이런 것들을 하나씩 해결해나간 과정을 정리한다.

---

## 📌 인증 플로우 설계

Beyond Meet의 인증 플로우를 먼저 정리해봤다.

```
1. 회원가입 (3단계)
   Step 1: 이메일/비밀번호 입력 → 이메일 인증 코드 발송 → 인증 완료
   Step 2: 닉네임, 생년월일, 성별, 국가 입력
   Step 3: 매칭 설정 (선호 성별, 나이 범위)
   → 회원가입 완료, JWT 발급, 자동 로그인

2. 로그인
   → JWT 발급, AsyncStorage에 저장

3. 자동 로그인
   → 앱 재시작 시 AsyncStorage에서 토큰 복원
   → Access Token 만료 시 Refresh Token으로 자동 갱신

4. 로그아웃
   → AsyncStorage 초기화, Socket 연결 해제
```

---

## 💡 상태 관리 라이브러리 선택

### 왜 Zustand를 선택했나

React Native에서 쓸 수 있는 상태 관리 라이브러리를 찾아봤다.

- **Redux**: 가장 유명하지만 보일러플레이트가 많다. 작은 프로젝트에는 과한 느낌이다.
- **MobX**: 데코레이터 문법이 TypeScript와 충돌하는 경우가 있다고 한다.
- **Recoil**: Facebook에서 만들었지만 아직 실험적인 단계다.
- **Zustand**: API가 간단하고, TypeScript 지원이 좋고, 번들 크기가 작다.

Beyond Meet에서 클라이언트 상태로 관리할 건 토큰, userId, role 정도였다. 사용자 프로필 같은 서버 데이터는 React Query로 캐싱할 거니까 상태 관리 라이브러리에 넣을 필요가 없었다. 그래서 가장 심플한 Zustand를 선택했다.

### AuthStore 구현

**`mobile/src/store/authStore.ts`**:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  userRole: 'USER' | 'ADMIN' | null;
  emailVerified: boolean;
  _hasHydrated: boolean;

  setAuth: (accessToken: string, refreshToken: string, userId: string, userRole: 'USER' | 'ADMIN', emailVerified: boolean, email: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      userId: null,
      userRole: null,
      emailVerified: false,
      _hasHydrated: false,

      setAuth: (accessToken, refreshToken, userId, userRole, emailVerified, email) =>
        set({
          isAuthenticated: true,
          accessToken,
          refreshToken,
          userId,
          userRole,
          emailVerified,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () =>
        set({
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          userId: null,
          userRole: null,
          emailVerified: false,
        }),

      setHasHydrated: (state) =>
        set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
```

여기서 핵심은 `persist` 미들웨어다. 이걸 쓰면 상태가 바뀔 때마다 자동으로 AsyncStorage에 저장되고, 앱을 다시 켜면 자동으로 복원된다. 일일이 AsyncStorage를 직접 다룰 필요가 없어서 편했다.

`_hasHydrated` 플래그는 나중에 설명할 건데, AsyncStorage에서 상태를 복원하는 동안 로딩 화면을 보여주기 위한 것이다.

### 클라이언트 상태와 서버 상태 분리

AuthStore에 `nickname`이나 `photos` 같은 사용자 프로필 데이터는 넣지 않았다. 처음에는 "어차피 매번 쓰는 데이터니까 여기 넣으면 편하지 않을까?" 싶었는데, 이러면 문제가 생긴다.

만약 사용자가 다른 기기에서 프로필을 수정하면? AuthStore에 저장된 데이터는 구버전 그대로다. 서버와 클라이언트의 데이터가 달라지는 것이다.

그래서 프로필 데이터는 React Query로 서버에서 가져오고 캐싱하기로 했다. React Query는 자동으로 백그라운드에서 데이터를 갱신해주니까 동기화 걱정이 없다.

이 패턴은 Kent C. Dodds의 글에서 영감을 받았다. 클라이언트 상태(토큰, UI 상태)와 서버 상태(프로필, 친구 목록)는 다르게 취급해야 한다는 것이다.

---

## 🔐 Axios 인터셉터로 토큰 관리

### 모든 요청에 토큰 자동 주입

API를 호출할 때마다 `Authorization` 헤더를 수동으로 넣는 건 귀찮고 실수하기 쉽다. Axios 인터셉터를 쓰면 모든 요청에 자동으로 토큰을 넣을 수 있다.

```typescript
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);
```

### 토큰 만료 시 자동 갱신

이 부분이 조금 까다로웠다. Access Token은 1시간 후에 만료되는데, 만료될 때마다 사용자에게 다시 로그인하라고 하면 UX가 나빠진다.

그래서 Response 인터셉터를 추가했다. 401 에러(인증 실패)가 발생하면 Refresh Token으로 새 Access Token을 발급받고, 실패했던 요청을 자동으로 다시 시도한다.

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // 새 토큰 발급
        const response = await axios.post(`${ENV.API_BASE_URL}/auth/refresh`, {
          refreshToken
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // 스토어에 저장
        useAuthStore.getState().setTokens(accessToken, newRefreshToken);

        // 원래 요청 재시도
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh Token도 만료 → 로그아웃
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

동작 과정을 정리하면 이렇다.

1. API 요청이 401 에러를 반환한다
2. Refresh Token으로 새 Access Token을 요청한다
3. 새 토큰을 AuthStore에 저장한다
4. 실패했던 원래 요청을 새 토큰으로 다시 시도한다
5. Refresh Token도 만료됐으면 로그아웃 처리한다

사용자 입장에서는 토큰이 만료됐는지도 모르고 자연스럽게 앱을 계속 사용할 수 있다.

---

## 📱 로그인 화면 구현

### React Query Mutation 훅

로그인 API 호출은 React Query의 `useMutation`을 사용했다.

**`mobile/src/hooks/useAuth.ts`**:

```typescript
export const useLogin = () => {
  const setAuth = useAuthStore(state => state.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: data => {
      // 1. AuthStore에 토큰 저장
      setAuth(
        data.accessToken,
        data.refreshToken,
        data.user.id,
        data.user.role,
        data.user.emailVerified ?? false,
        data.user.email,
      );

      // 2. Socket.io 연결
      socketService.connect();

      // 3. 캐시된 프로필 무효화 (새로 가져오도록)
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });

      Toast.show({
        type: 'success',
        text1: '로그인 성공',
        text2: `${data.user.nickname}님, 환영합니다!`,
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: '로그인 실패',
        text2: error.response?.data?.error?.message || '다시 시도해주세요',
      });
    },
  });
};
```

로그인 성공 시 해야 할 일이 세 가지다. 토큰 저장, Socket.io 연결, 캐시 무효화. 이걸 `onSuccess` 콜백에서 한 번에 처리했다.

### 로그인 화면 컴포넌트

**`mobile/src/screens/auth/LoginScreen.tsx`** (핵심 부분):

```typescript
const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  const handleLogin = () => {
    if (!email || !password) return;
    loginMutation.mutate({ email, password });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Text style={styles.title}>로그인</Text>
        <Text style={styles.subtitle}>
          계정에 로그인하고{'\n'}새로운 인연을 만나보세요
        </Text>

        <Input
          label="이메일"
          placeholder="example@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="비밀번호"
          placeholder="8자 이상 입력"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[
            styles.loginButton,
            (!email || !password || loginMutation.isPending) && styles.disabled,
          ]}
          onPress={handleLogin}
          disabled={!email || !password || loginMutation.isPending}
        >
          <Text style={styles.loginButtonText}>
            {loginMutation.isPending ? '로그인 중...' : '로그인'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
```

`KeyboardAvoidingView`는 iOS와 Android에서 키보드가 입력창을 가리는 문제를 해결해준다. 이게 없으면 키보드가 올라왔을 때 비밀번호 입력창이 안 보일 수 있다.

`loginMutation.isPending`으로 로딩 상태를 확인할 수 있어서, 버튼을 비활성화하고 "로그인 중..." 텍스트를 보여주는 게 간단했다.

---

## 📝 회원가입 화면 구현

### 3단계 폼 구조

회원가입은 한 화면에서 3단계로 나눠서 진행하도록 만들었다. 한 번에 너무 많은 정보를 입력하라고 하면 사용자가 지치기 때문이다.

```typescript
const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    nickname: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    gender: '',
    country: 'KR',
    preferredGender: '',
    minAge: 18,
    maxAge: 40,
  });

  const handleNextStep = () => {
    if (step === 1) {
      // 이메일/비밀번호 검증 후 이메일 인증 화면으로 이동
      if (!validateStep1()) return;
      sendCodeMutation.mutate(formData.email);
    } else if (step === 2) {
      // 프로필 정보 검증 후 다음 단계
      if (!validateStep2()) return;
      setStep(3);
    } else if (step === 3) {
      // 매칭 설정 검증 후 회원가입 완료
      if (!validateStep3()) return;
      handleRegister();
    }
  };
};
```

각 단계에서 다음으로 넘어가기 전에 필수 입력값을 검증한다. 이메일 형식, 비밀번호 강도 규칙, 닉네임 길이 등을 체크한다.

### 진행 표시 UI

사용자가 현재 몇 단계에 있는지 시각적으로 보여주면 좋을 것 같아서 간단한 진행 표시 UI를 추가했다.

```typescript
<View style={styles.progressContainer}>
  <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
  <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
  <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
  <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
  <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
</View>
```

점 세 개를 선으로 연결하고, 현재 단계에 따라 색상이 바뀌도록 했다. 단순하지만 사용자가 "아, 이제 2단계네" 하고 알 수 있어서 좋다.

---

## 🔄 자동 로그인 구현

### Rehydration 문제 해결

앱을 시작할 때 AsyncStorage에서 토큰을 복원하는 과정에서 문제가 있었다. 복원이 끝나기 전에 `isAuthenticated`가 `false`라서 로그인 화면이 잠깐 보였다가 메인 화면으로 넘어가는 깜빡임 현상이 발생했다.

이걸 해결하려고 `_hasHydrated` 플래그를 추가했다. 복원이 완료될 때까지는 로딩 화면을 보여주고, 완료되면 `isAuthenticated` 값에 따라 적절한 화면을 보여준다.

**`mobile/src/navigation/RootNavigator.tsx`**:

```typescript
const AppContent: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const emailVerified = useAuthStore((state) => state.emailVerified);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // AsyncStorage에서 복원 중이면 로딩 화면
  if (!hasHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !emailVerified ? (
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
};
```

동작 과정을 정리하면 이렇다.

1. 앱 시작 → `hasHydrated === false` → 로딩 화면
2. Zustand persist가 AsyncStorage에서 상태 복원
3. 복원 완료 → `onRehydrateStorage` 콜백 → `setHasHydrated(true)`
4. `isAuthenticated === true`면 메인 화면, `false`면 로그인 화면

이제 깜빡임 없이 자연스럽게 자동 로그인이 된다.

---

## 🚀 로그아웃 구현

로그아웃은 단순히 상태만 초기화하면 안 된다. Socket.io 연결도 끊어야 하고, React Query 캐시도 비워야 한다. 안 그러면 다른 계정으로 로그인했을 때 이전 사용자의 데이터가 보일 수 있다.

```typescript
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. 서버에 로그아웃 알림 (실패해도 괜찮음)
      authApi.logout().catch(() => {});

      // 2. Socket 연결 해제
      socketService.disconnect();

      // 3. React Query 캐시 비우기
      queryClient.clear();

      // 4. Auth 상태 초기화
      useAuthStore.getState().logout();
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: '로그아웃',
        text2: '안전하게 로그아웃되었습니다',
      });
    },
  });
};
```

순서가 중요하다. Socket을 먼저 끊고, 캐시를 비우고, 마지막에 상태를 초기화한다. 상태를 먼저 초기화하면 Socket 연결 해제 과정에서 문제가 생길 수 있다.

---

## 🔧 겪었던 문제들

### 토큰 갱신 중 중복 요청

여러 API 요청이 거의 동시에 401 에러를 받으면 토큰 갱신 요청도 여러 번 발생하는 문제가 있었다. 이론적으로는 갱신 중인 요청들을 큐에 넣고 기다리게 해야 하는데, 현재 앱에서는 동시 요청이 많지 않아서 일단 `_retry` 플래그만 사용하기로 했다.

```typescript
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  // 갱신 로직...
}
```

추후에 동시 요청이 많아지면 대기 큐 패턴을 적용할 예정이다.

---

## 🎯 테스트 결과

```bash
# 로그인 테스트
1. 이메일/비밀번호 입력 → 로그인 버튼 탭
2. AsyncStorage에 토큰 저장 확인
3. 메인 화면으로 이동
4. 앱 종료 후 재시작
5. 자동 로그인 확인 (로딩 화면 → 메인 화면)

# 토큰 갱신 테스트 (Access Token 만료 시간을 5분으로 설정)
1. 로그인 후 5분 대기
2. API 요청 (프로필 조회)
3. 401 에러 → 자동 갱신 → 재요청 성공
4. 사용자는 로그아웃 없이 계속 사용
```

예상대로 동작했다.

---

## 📚 다음 글 예고

**Part 7: 이메일 인증 시스템**

다음 글에서는 회원가입 시 이메일 인증 코드를 발송하고, 인증을 완료해야 앱을 사용할 수 있도록 하는 시스템을 구축한다. Resend API를 사용해 이메일을 보내고, Redis에 인증 코드를 저장하는 과정을 다룰 예정이다.

---

## 💬 마치며

React Native에서 인증 UI를 구현하면서 모바일 앱 특유의 고려사항들을 많이 배웠다.

웹에서는 당연하게 쓰던 쿠키 기반 세션이 React Native에서는 복잡해진다는 걸 알았고, 그래서 JWT + AsyncStorage 조합이 모바일에서 더 적합하다는 걸 이해하게 됐다. Zustand의 persist 미들웨어는 정말 편했다. 상태 저장/복원을 자동으로 해주니까 일일이 AsyncStorage를 다룰 필요가 없었다.

Axios 인터셉터로 토큰 자동 주입과 갱신을 구현한 것도 좋은 경험이었다. 한 번 세팅해두면 모든 API 호출에서 토큰 관리를 신경 쓰지 않아도 된다.

다음 글에서는 이메일 인증 시스템을 구축한다.

---

**태그**: `React Native` `Zustand` `AsyncStorage` `JWT` `Axios` `인증` `자동 로그인`
