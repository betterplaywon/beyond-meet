/**
 * 웰컴 화면
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../@types';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../styles/theme';

type WelcomeScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Welcome'
>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.illustration}>🎥</Text>
          <Text style={styles.title}>영상으로 만나는{'\n'}새로운 사람들</Text>
          <Text style={styles.description}>
            실시간 영상 통화로 진짜 모습을 만나보세요
          </Text>
        </View>

        {/* Page Indicator */}
        <View style={styles.pageIndicator}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          title="시작하기"
          variant="primary"
          fullWidth
          onPress={() => navigation.navigate('Register')}
        />
        <Button
          title="이미 계정이 있어요"
          variant="text"
          fullWidth
          onPress={() => navigation.navigate('Login')}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  illustration: {
    fontSize: 120,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary + '40',
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  buttonContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
});

export default WelcomeScreen;
