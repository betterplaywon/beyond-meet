# Screens

화면 컴포넌트를 저장하는 폴더입니다.

## 폴더 구조

- `auth/` - 로그인, 회원가입 화면
- `home/` - 홈 화면
- `call/` - 영상 통화 화면
- `profile/` - 프로필 화면

## 화면 작성 규칙

- 각 화면은 React Navigation과 연동
- Redux Toolkit으로 상태 관리
- API 호출 시 에러 처리 필수
- 로딩 상태 표시

## 예시

```typescript
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUser } from '../../store/slices/userSlice';

export const HomeScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.user);

  useEffect(() => {
    dispatch(fetchUser());
  }, []);

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <Text>Home Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```
