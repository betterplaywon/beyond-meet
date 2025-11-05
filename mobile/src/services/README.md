# Services

API 호출 관련 파일을 저장하는 폴더입니다.

## 폴더 구조

- `api.ts` - Axios 설정 및 인터셉터
- `endpoints/` - API 엔드포인트별 함수

## API 호출 규칙

- Axios 사용
- Request/Response 인터셉터 설정
- JWT 토큰 자동 추가
- 에러 처리 일관성 유지

## 예시

```typescript
// services/api.ts
import axios from 'axios';
import { getAccessToken } from '../utils/auth';

const api = axios.create({
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
});

// Request 인터셉터
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response 인터셉터
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 토큰 갱신 로직
    }
    return Promise.reject(error);
  }
);

export default api;
```

```typescript
// services/endpoints/user.ts
import api from '../api';

export const userApi = {
  getUser: (userId: string) => api.get(`/api/users/${userId}`),
  updateUser: (userId: string, data: any) => api.put(`/api/users/${userId}`, data),
  uploadPhoto: (userId: string, photo: FormData) =>
    api.post(`/api/users/${userId}/photos`, photo),
};
```
