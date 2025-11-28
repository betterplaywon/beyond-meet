/**
 * 어드민 네비게이터
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

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

export default AdminNavigator;
