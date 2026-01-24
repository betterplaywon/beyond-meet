# Part 6: React Native 인증 UI와 상태 관리

Part 5에서 백엔드 JWT 인증 시스템을 구축했다면, 이번에는 모바일 앱에서 이를 어떻게 활용하는지 다룬다. React Native에서 로그인/회원가입 UI를 구현하고, Zustand로 인증 상태를 관리하며, AsyncStorage에 토큰을 저장해 자동 로그인을 구현한 과정을 정리했다.

## 1. 전체 인증 플로우

먼저 Beyond Meet의 인증 플로우를 정리하면 다음과 같다:

```
1. 회원가입 3단계
   Step 1: 이메일/비밀번호 입력 → 이메일 인증 코드 발송 → 인증 완료
   Step 2: 닉네임, 생년월일, 성별, 국가 입력
   Step 3: 매칭 설정(선호 성별, 나이 범위)
   → 회원가입 완료, JWT 발급, 자동 로그인

2. 로그인
   → JWT 발급, AsyncStorage 저장

3. 자동 로그인
   → 앱 재시작 시 AsyncStorage에서 토큰 복원
   → 만료 시 Refresh Token으로 자동 갱신

4. 로그아웃
   → AsyncStorage 초기화, Socket 연결 해제
```

백엔드 API는 Part 5에서 구축한 JWT 기반 인증을 사용한다.

## 2. Zustand로 인증 상태 관리

### 2.1 왜 Zustand를 선택했나?

React Native 앱의 상태 관리 라이브러리는 여러 가지가 있다:

- **Redux**: 가장 유명하지만 보일러플레이트가 너무 많다
- **MobX**: 데코레이터 문법이 TypeScript와 충돌할 수 있다
- **Recoil**: Facebook 공식이지만 아직 실험적이다
- **Zustand**: 간단한 API, TypeScript 친화적, 가볍다

Beyond Meet에서는 인증 상태(토큰, userId, role 등)만 클라이언트 상태로 관리하면 되므로, 가장 간단한 Zustand를 선택했다.

### 2.2 AuthStore 구조

[mobile/src/store/authStore.ts](mobile/src/store/authStore.ts)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  // State
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  userRole: 'USER' | 'ADMIN' | null;
  emailVerified: boolean;
  userEmail: string | null;
  _hasHydrated: boolean;

  // Actions
  setAuth: (accessToken: string, refreshToken: string, userId: string, userRole: 'USER' | 'ADMIN', emailVerified: boolean, email: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setEmailVerified: (verified: boolean) => void;
  logout: () => void;
  isAdmin: () => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      userId: null,
      userRole: null,
      emailVerified: false,
      userEmail: null,
      _hasHydrated: false,

      // Actions
      setAuth: (accessToken, refreshToken, userId, userRole, emailVerified, email) =>
        set({
          isAuthenticated: true,
          accessToken,
          refreshToken,
          userId,
          userRole,
          emailVerified,
          userEmail: email,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setEmailVerified: (verified) =>
        set({ emailVerified: verified }),

      logout: () =>
        set({
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
          userId: null,
          userRole: null,
          emailVerified: false,
          userEmail: null,
        }),

      isAdmin: () => get().userRole === 'ADMIN',

      setHasHydrated: (state) =>
        set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        console.log('[AuthStore] Rehydration completed');
        state?.setHasHydrated(true);
      },
    }
  )
);
```

**핵심 포인트**:

1. **persist 미들웨어**: AsyncStorage에 자동으로 상태를 저장/복원한다
2. **_hasHydrated 플래그**: AsyncStorage에서 상태를 복원하는 동안 로딩 화면을 표시하기 위한 플래그
3. **상태와 액션 분리**: Redux처럼 상태는 읽기 전용, 변경은 액션 함수를 통해서만 가능

### 2.3 왜 사용자 프로필 데이터는 저장하지 않았나?

AuthStore에는 `nickname`, `photos` 같은 사용자 프로필 데이터를 저장하지 않았다. 그 이유는:

- **클라이언트 상태 vs 서버 상태 분리**: 토큰과 userId는 클라이언트가 관리하는 상태이고, 사용자 프로필은 서버에서 관리하는 상태다
- **React Query 활용**: 사용자 프로필은 `@tanstack/react-query`로 캐싱하고 자동 동기화한다

이 패턴은 Kent C. Dodds의 [Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react) 글에서 영감을 받았다.

## 3. React Query로 인증 API 호출

### 3.1 인증 API 클라이언트

[mobile/src/api/auth.api.ts](mobile/src/api/auth.api.ts)

```typescript
import { apiClient } from './client';
import { LoginCredentials, RegisterData, AuthResponse, ApiResponse } from '../@types';

export const authApi = {
  /**
   * 로그인
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );
    return response.data.data!;
  },

  /**
   * 회원가입
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/register',
      data
    );
    return response.data.data!;
  },

  /**
   * 토큰 갱신
   */
  refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await apiClient.post<ApiResponse<{ accessToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    );
    return response.data.data!;
  },

  /**
   * 로그아웃
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
```

### 3.2 React Query Mutation Hooks

[mobile/src/hooks/useAuth.ts](mobile/src/hooks/useAuth.ts)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { LoginCredentials, RegisterData } from '../@types';
import Toast from 'react-native-toast-message';
import { queryKeys } from '../constants/queryKeys';
import * as socketService from '../services/socketService';

/**
 * 로그인 mutation
 */
export const useLogin = () => {
  const setAuth = useAuthStore(state => state.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: data => {
      // 1. authStore에 토큰, userId, role, emailVerified 저장
      setAuth(
        data.accessToken,
        data.refreshToken,
        data.user.id,
        data.user.role,
        data.user.emailVerified ?? false,
        data.user.email,
      );

      // 2. Socket 연결
      console.log('[LOGIN] Connecting socket...');
      socketService.connect();

      // 3. 프로필 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });

      if (data.user.emailVerified) {
        Toast.show({
          type: 'success',
          text1: '로그인 성공',
          text2: `${data.user.nickname}님, 환영합니다!`,
        });
      }
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

/**
 * 로그아웃 mutation
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. 서버에 로그아웃 알림
      authApi.logout().catch(() => {});

      // 2. Socket 연결 해제
      console.log('[LOGOUT] Disconnecting socket...');
      socketService.disconnect();

      // 3. React Query 캐시 정리
      console.log('[LOGOUT] Clearing query cache...');
      queryClient.clear();

      // 4. Auth 상태 초기화
      console.log('[LOGOUT] Clearing auth state...');
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

**핵심 포인트**:

1. **Socket 연결 관리**: 로그인 성공 시 Socket.io 연결, 로그아웃 시 연결 해제
2. **React Query 캐시 정리**: 로그아웃 시 모든 쿼리 캐시를 초기화해 다른 사용자 데이터가 남지 않도록 처리
3. **순서 보장**: Socket 해제 → 캐시 정리 → 상태 초기화 순으로 진행

## 4. Axios 인터셉터로 토큰 자동 주입 및 갱신

### 4.1 Request Interceptor: 자동 토큰 주입

[mobile/src/services/api.ts](mobile/src/services/api.ts:26-39)

```typescript
/**
 * Request 인터셉터
 * 모든 요청에 JWT 토큰 자동 추가
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);
```

모든 API 요청에 자동으로 `Authorization: Bearer <token>` 헤더를 추가한다.

### 4.2 Response Interceptor: 401 에러 시 토큰 자동 갱신

[mobile/src/services/api.ts](mobile/src/services/api.ts:45-96)

```typescript
/**
 * Response 인터셉터
 * 에러 처리 및 토큰 갱신 로직
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 401 Unauthorized - 토큰 만료
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // 토큰 갱신 요청
        const response = await axios.post<ApiResponse<{
          accessToken: string;
          refreshToken: string;
        }>>(
          `${ENV.API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data!;

        // 새 토큰 저장
        useAuthStore.getState().setTokens(accessToken, newRefreshToken);

        // 원래 요청 재시도
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        // 토큰 갱신 실패 - 로그아웃 처리
        return Promise.reject(refreshError);
      }
    }

    // 기타 에러
    return Promise.reject(error);
  }
);
```

**동작 과정**:

1. API 요청이 `401 Unauthorized` 에러를 반환하면
2. Refresh Token으로 새 Access Token을 요청한다
3. 새 토큰을 AuthStore에 저장한다
4. 실패했던 원래 요청을 새 토큰으로 재시도한다
5. Refresh Token도 만료됐다면 로그아웃 처리된다

이 패턴은 Axios 공식 문서의 [Interceptor 예제](https://axios-http.com/docs/interceptors)에서 참고했다.

## 5. 로그인 화면 구현

### 5.1 LoginScreen UI

[mobile/src/screens/auth/LoginScreen.tsx](mobile/src/screens/auth/LoginScreen.tsx)

```typescript
const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  const handleLogin = () => {
    if (!email || !password) {
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 타이틀 */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>로그인</Text>
            <Text style={styles.subtitle}>
              계정에 로그인하고{'\n'}새로운 인연을 만나보세요
            </Text>
          </View>

          {/* 폼 */}
          <View style={styles.form}>
            <Input
              label="이메일"
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Icon name="mail" size={20} color={colors.textTertiary} />}
            />

            <Input
              label="비밀번호"
              placeholder="8자 이상 입력"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={<Icon name="lock" size={20} color={colors.textTertiary} />}
            />
          </View>

          {/* 로그인 버튼 */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              (!email || !password || loginMutation.isPending) && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={!email || !password || loginMutation.isPending}
          >
            <Text style={styles.loginButtonText}>
              {loginMutation.isPending ? '로그인 중...' : '로그인'}
            </Text>
          </TouchableOpacity>

          {/* 회원가입 링크 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>계정이 없으신가요? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
```

**UI 구현 포인트**:

1. **KeyboardAvoidingView**: iOS/Android에서 키보드가 입력창을 가리지 않도록 처리
2. **로딩 상태**: `loginMutation.isPending`으로 버튼 비활성화 및 "로그인 중..." 표시
3. **Pill 형태 버튼**: `borderRadius: 50`으로 양쪽 끝이 둥근 버튼 디자인

## 6. 회원가입 화면 구현

### 6.1 3단계 폼 구조

회원가입은 3단계로 나뉘어져 있다:

```typescript
const RegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    passwordConfirm: '',
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
      // Step 1 검증: 이메일/비밀번호
      if (!formData.email.trim()) {
        Alert.alert('오류', '이메일을 입력해주세요');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        Alert.alert('오류', '올바른 이메일 형식을 입력해주세요');
        return;
      }

      if (formData.password.length < 8) {
        Alert.alert('오류', '비밀번호는 8자 이상이어야 합니다');
        return;
      }

      // 비밀번호 규칙 검증 (대문자, 숫자, 특수문자)
      if (!/[A-Z]/.test(formData.password)) {
        Alert.alert('오류', '비밀번호에 대문자가 최소 1개 포함되어야 합니다');
        return;
      }

      // 이메일 인증 코드 발송 후 인증 화면으로 이동
      sendCodeMutation.mutate(formData.email, {
        onSuccess: () => {
          navigation.navigate('EmailVerification', {
            email: formData.email,
            formData: formData,
          });
        },
      });

    } else if (step === 2) {
      // Step 2 검증: 프로필 정보
      if (!formData.nickname.trim()) {
        Alert.alert('오류', '닉네임을 입력해주세요');
        return;
      }
      setStep(3);

    } else if (step === 3) {
      // Step 3 검증: 매칭 설정
      if (!formData.preferredGender) {
        Alert.alert('오류', '선호 성별을 선택해주세요');
        return;
      }
      handleRegister();
    }
  };
};
```

### 6.2 진행 표시 UI

각 단계별 진행 상황을 시각적으로 표시한다:

```typescript
{/* 진행 표시 */}
<View style={styles.progressContainer}>
  <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
  <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
  <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
  <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
  <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
</View>
```

현재 단계에 따라 점과 선의 색상이 바뀐다.

## 7. 자동 로그인 구현

### 7.1 AsyncStorage Rehydration

앱 시작 시 AsyncStorage에서 토큰을 복원하는 과정:

[mobile/src/navigation/RootNavigator.tsx](mobile/src/navigation/RootNavigator.tsx:40-59)

```typescript
const AppContent: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const emailVerified = useAuthStore((state) => state.emailVerified);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  // AsyncStorage 리하이드레이션 완료될 때까지 로딩 화면 표시
  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          {/* ... */}
        </>
      )}
    </Stack.Navigator>
  );
};
```

**동작 과정**:

1. 앱 시작 시 `hasHydrated === false` → 로딩 화면 표시
2. Zustand persist 미들웨어가 AsyncStorage에서 토큰 복원
3. 복원 완료 시 `onRehydrateStorage` 콜백에서 `setHasHydrated(true)` 호출
4. `isAuthenticated === true` → 메인 화면으로 자동 이동

### 7.2 토큰 만료 시 자동 갱신

위에서 설명한 Axios Response Interceptor가 자동으로 처리한다:

- Access Token 만료 시 401 에러 발생
- Interceptor가 Refresh Token으로 새 Access Token 요청
- 새 토큰으로 원래 요청 재시도
- 사용자는 로그아웃 없이 계속 앱을 사용할 수 있다

## 8. 테스트 결과

### 8.1 로그인 플로우

```bash
# iOS 시뮬레이터 실행
cd mobile
npm run ios

# 테스트 시나리오
1. 로그인 화면에서 이메일/비밀번호 입력
2. "로그인" 버튼 탭
3. AsyncStorage에 토큰 저장 확인
4. 메인 화면으로 이동
5. 앱 종료 후 재시작
6. 자동 로그인 확인 (로딩 화면 → 메인 화면)
```

**결과**:
```
[AuthStore] Rehydration completed
[LOGIN] Connecting socket...
Socket connected: zT3xF5g2k
[LOGIN] Login success
```

### 8.2 토큰 갱신 테스트

Access Token 만료 시간을 5분으로 설정하고 테스트했다:

```bash
# 1. 로그인 후 5분 대기
# 2. API 요청 (프로필 조회)
# 3. 401 에러 발생 → 자동 갱신 → 재요청 성공

[Axios] 401 Unauthorized
[Axios] Refreshing token...
[Axios] Token refreshed, retrying original request
[API] GET /users/me - 200 OK
```

사용자는 로그아웃 없이 계속 앱을 사용할 수 있었다.

## 9. 트러블슈팅

### 9.1 문제: AsyncStorage Rehydration 중 깜빡임

**증상**: 앱 시작 시 로그인 화면이 잠깐 보였다가 메인 화면으로 이동하는 깜빡임 현상

**원인**: Zustand persist 미들웨어가 AsyncStorage에서 상태를 복원하는 동안 `isAuthenticated === false`였기 때문

**해결**:
```typescript
// _hasHydrated 플래그 추가
const hasHydrated = useAuthStore((state) => state._hasHydrated);

if (!hasHydrated) {
  return <ActivityIndicator />; // 로딩 화면
}
```

복원이 완료될 때까지 로딩 화면을 표시해 깜빡임을 제거했다.

### 9.2 문제: 토큰 갱신 중 중복 요청

**증상**: 여러 API 요청이 동시에 401 에러를 받으면 토큰 갱신 요청이 중복으로 발생했다

**원인**: Axios Interceptor가 각 요청마다 독립적으로 토큰 갱신을 시도했기 때문

**해결**:
```typescript
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// 토큰 갱신 중이면 대기 큐에 추가
if (isRefreshing) {
  return new Promise((resolve) => {
    refreshSubscribers.push((token: string) => {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      resolve(api(originalRequest));
    });
  });
}
```

하지만 현재 앱에서는 동시 요청이 많지 않아 일단 간단한 `_retry` 플래그만 사용하기로 했다. 추후 필요하면 대기 큐 패턴을 적용할 예정이다.

## 10. 개선 사항

현재 구현은 Beta 단계이므로 다음 기능들은 추후 추가할 예정이다:

1. **Biometric 인증**: Face ID/Touch ID로 빠른 로그인
2. **비밀번호 찾기**: 이메일로 임시 비밀번호 발송
3. **소셜 로그인**: Google, Apple 로그인 연동
4. **토큰 갱신 대기 큐**: 동시 요청 시 중복 갱신 방지
5. **오프라인 모드**: 네트워크 끊김 시 캐시된 데이터 표시

## 11. 정리

React Native 인증 UI 구현을 정리하면:

1. **Zustand + persist**: 토큰을 AsyncStorage에 자동 저장/복원
2. **React Query**: 로그인/회원가입 API 호출 및 에러 처리
3. **Axios Interceptor**: 모든 요청에 토큰 자동 주입, 401 에러 시 자동 갱신
4. **Navigation Guard**: `isAuthenticated`와 `emailVerified` 상태에 따라 화면 분기
5. **Rehydration 로딩**: AsyncStorage 복원 완료까지 로딩 화면 표시

이제 사용자는 한 번 로그인하면 앱을 종료해도 자동으로 로그인 상태가 유지되고, 토큰이 만료돼도 자동으로 갱신되어 끊김 없는 경험을 할 수 있다.

다음 Part에서는 이메일 인증 시스템 구축을 다룬다. 회원가입 시 이메일 인증 코드를 발송하고, 인증 완료 후에만 앱을 사용할 수 있도록 하는 과정을 정리할 예정이다.
