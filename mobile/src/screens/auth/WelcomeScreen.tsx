/**
 * 웰컴 화면
 * Figma: Cupid Arrow - Get Started 디자인 적용
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../@types';
import { colors, typography, spacing } from '../../styles/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

type WelcomeScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Welcome'
>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 하단 blur 배경 효과 */}
      <View style={styles.blurBackground}>
        <View style={styles.blurCircle} />
      </View>

      {/* 콘텐츠 영역 */}
      <View style={styles.content}>
        <Text style={styles.title}>영상으로 만나는{'\n'}새로운 인연</Text>
        <Text style={styles.description}>
          실시간 영상 통화로 진짜 모습을 만나보세요.{'\n'}
          새로운 인연의 시작을 함께해요.
        </Text>
      </View>

      {/* 버튼 영역 */}
      <View style={styles.buttonContainer}>
        {/* 시작하기 버튼 (Pill + 아이콘) */}
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Register')}
        >
          <View style={styles.buttonIconCircle}>
            <Icon name="person" size={22} color={colors.primary} />
          </View>
          <Text style={styles.primaryButtonText}>시작하기</Text>
        </TouchableOpacity>

        {/* 로그인 링크 */}
        <View style={styles.loginLinkContainer}>
          <Text style={styles.loginText}>이미 계정이 있으신가요? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>로그인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  blurBackground: {
    position: 'absolute',
    bottom: -height * 0.15,
    left: -width * 0.15,
    right: -width * 0.15,
    height: height * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurCircle: {
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: width * 0.65,
    backgroundColor: colors.primary,
    opacity: 0.12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 36,
  },
  description: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 50,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    width: '100%',
    justifyContent: 'center',
  },
  buttonIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 8,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.white,
    fontSize: 18,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  loginLink: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default WelcomeScreen;
