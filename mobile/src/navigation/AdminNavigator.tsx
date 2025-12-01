/**
 * 어드민 네비게이터
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import { colors } from '../styles/theme';

// Screens
import AdminScreen from '../screens/admin/AdminScreen';
import ModerationLogsScreen from '../screens/admin/ModerationLogsScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';

export type AdminStackParamList = {
  AdminMain: undefined;
  ModerationLogs: undefined;
  Reports: undefined;
};

const Stack = createStackNavigator<AdminStackParamList>();

const AdminNavigator: React.FC = () => {
  const isAdmin = useAuthStore((state) => state.isAdmin());

  // Defense in depth: 직접 네비게이션 차단
  if (!isAdmin) {
    return (
      <View style={styles.unauthorized}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>접근 권한이 없습니다</Text>
        <Text style={styles.message}>관리자만 접근할 수 있는 페이지입니다</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AdminMain" component={AdminScreen} />
      <Stack.Screen name="ModerationLogs" component={ModerationLogsScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  unauthorized: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default AdminNavigator;
