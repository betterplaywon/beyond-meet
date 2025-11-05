# Hooks

Custom React Hooks를 저장하는 폴더입니다.

## Custom Hooks 작성 규칙

- `use` 접두사 사용
- TypeScript 타입 정의
- 재사용 가능한 로직 추상화

## 예시

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { getAccessToken, removeAccessToken } from '../utils/auth';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAccessToken();
      setIsAuthenticated(!!token);
      setLoading(false);
    };
    checkAuth();
  }, []);

  const logout = async () => {
    await removeAccessToken();
    setIsAuthenticated(false);
  };

  return { isAuthenticated, loading, logout };
};
```

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```
