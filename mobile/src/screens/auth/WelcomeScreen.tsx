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
import { useTranslation } from 'react-i18next';
import { AuthStackParamList } from '../../@types';
import { Button } from '../../components/common';
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
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 하단 blur 배경 효과 */}
      <View style={styles.blurBackground}>
        <View style={styles.blurCircle} />
      </View>

      {/* 콘텐츠 영역 */}
      <View style={styles.content}>
        <Text style={styles.title}>{t('welcome.title')}</Text>
        <Text style={styles.description}>
          {t('welcome.description')}
        </Text>
      </View>

      {/* 버튼 영역 */}
      <View style={styles.buttonContainer}>
        {/* 시작하기 버튼 (Pill + 아이콘) */}
        <Button
          title={t('auth.register')}
          variant="primary"
          size="medium"
          fullWidth
          borderRadius="pill"
          icon={
            <View style={styles.buttonIconCircle}>
              <Icon name="person" size={18} color={colors.primary} />
            </View>
          }
          iconPosition="left"
          onPress={() => navigation.navigate('Register')}
        />

        {/* 로그인 링크 */}
        <View style={styles.loginLinkContainer}>
          <Text style={styles.loginText}>{t('auth.hasAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>{t('auth.login')}</Text>
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
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  buttonIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
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
    ...typography.body2Medium,
    color: colors.primary,
  },
});

export default WelcomeScreen;
