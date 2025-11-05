# Utils

유틸리티 함수를 저장하는 폴더입니다.

## 주요 파일

- `auth.ts` - 인증 관련 유틸리티
- `validation.ts` - 입력 검증 함수
- `formatter.ts` - 데이터 포맷팅 함수
- `storage.ts` - AsyncStorage 래퍼

## 유틸리티 함수 작성 규칙

- 순수 함수 작성
- TypeScript 타입 정의
- 단위 테스트 작성

## 예시

```typescript
// utils/validation.ts
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
};

export const isValidNickname = (nickname: string): boolean => {
  return nickname.length >= 2 && nickname.length <= 10;
};
```

```typescript
// utils/formatter.ts
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{4})(\d{4})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return phone;
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('ko-KR');
};
```
