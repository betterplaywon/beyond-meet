/**
 * 웰컴 화면
 * Figma: Simple Login - Startup Screen 디자인 적용
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../@types';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../styles/theme';
import Svg, { Path } from 'react-native-svg';

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
      {/* 상단 웨이브 배경 */}
      <View style={styles.curveContainer}>
        <Svg
          width={width}
          height={height * 0.5}
          viewBox={`0 0 ${width} ${height * 0.5}`}
        >
          <Path
            d={`M0,0
               L${width},0
               L${width},${height * 0.32}
               C${width * 0.75},${height * 0.38} ${width * 0.55},${height * 0.42} ${width * 0.35},${height * 0.38}
               C${width * 0.15},${height * 0.34} 0,${height * 0.4} 0,${height * 0.4}
               Z`}
            fill={colors.primary}
          />
        </Svg>
      </View>

      {/* 콘텐츠 영역 */}
      <View style={styles.content}>
        <Text style={styles.title}>영상으로 만나는{'\n'}새로운 사람들</Text>
        <View style={styles.underline} />
        <Text style={styles.description}>
          실시간 영상 통화로 진짜 모습을 만나보세요
        </Text>
      </View>

      {/* 버튼 영역 */}
      <View style={styles.buttonContainer}>
        <Button
          title="시작하기"
          variant="primary"
          size="large"
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
  curveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: height * 0.35,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  underline: {
    width: 70,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginBottom: spacing.lg,
  },
  description: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  buttonContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
});

export default WelcomeScreen;
