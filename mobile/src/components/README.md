# Components

재사용 가능한 UI 컴포넌트를 저장하는 폴더입니다.

## 폴더 구조

- `common/` - 버튼, 입력 필드, 카드 등 공통 컴포넌트
- `video/` - 영상 통화 관련 컴포넌트
- `profile/` - 프로필 관련 컴포넌트

## 컴포넌트 작성 규칙

- Functional Component + Hooks 사용
- TypeScript 필수
- Props 인터페이스 정의
- StyleSheet 사용 (인라인 스타일 지양)

## 예시

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
}

export const Button: React.FC<ButtonProps> = ({ title, onPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  text: {
    fontSize: 16,
  },
});
```
