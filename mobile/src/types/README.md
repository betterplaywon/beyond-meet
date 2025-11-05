# Types

TypeScript 타입 정의를 저장하는 폴더입니다.

## 주요 파일

- `user.ts` - 사용자 관련 타입
- `api.ts` - API 응답 타입
- `navigation.ts` - 네비게이션 타입
- `common.ts` - 공통 타입

## 타입 정의 규칙

- 명확한 타입 이름 사용
- 인터페이스와 타입 구분 사용
- 백엔드 API 응답과 일치하는 타입 정의

## 예시

```typescript
// types/user.ts
export interface User {
  id: string;
  email: string;
  nickname: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  country: string;
  bio?: string;
  profilePhotos: string[];
  interests: string[];
  onlineStatus: 'ONLINE' | 'OFFLINE' | 'IN_CALL';
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  preferredGender: 'MALE' | 'FEMALE' | 'OTHER';
  minAge: number;
  maxAge: number;
  preferredCountries: string[];
}
```

```typescript
// types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
  };
}
```
