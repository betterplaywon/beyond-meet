# Navigation

React Navigation 설정 파일을 저장하는 폴더입니다.

## 주요 파일

- `RootNavigator.tsx` - 앱의 전체 네비게이션 구조
- `AuthNavigator.tsx` - 인증 관련 네비게이션
- `MainNavigator.tsx` - 메인 탭 네비게이션

## 네비게이션 구조

```
RootNavigator
├── AuthNavigator (로그인 전)
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── OnboardingScreen
└── MainNavigator (로그인 후)
    ├── HomeTab
    ├── FriendsTab
    └── ProfileTab
```

## 예시

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```
