/**
 * 스플래시 화면
 * Figma: Simple Login - Splash Screen 디자인 적용
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../@types';
import { colors, typography, spacing } from '../../styles/theme';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

type SplashScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'Splash'
>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Welcome');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation, fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      {/* 상단 곡선 장식 */}
      <View style={styles.curveContainer}>
        <Svg
          width={width}
          height={height * 0.12}
          viewBox={`0 0 ${width} ${height * 0.12}`}
        >
          <Path
            d={`M0,0 L${width},0 L${width},${height * 0.06} Q${width * 0.5},${height * 0.14} 0,${height * 0.06} Z`}
            fill={colors.primary}
          />
        </Svg>
      </View>

      {/* 로고 및 텍스트 */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.logo}>Beyond Meet</Text>
        <View style={styles.underline} />
        <Text style={styles.subtitle}>영상으로 만나는 새로운 사람들</Text>
      </Animated.View>

      {/* 하단 로딩 표시 */}
      <Animated.View style={[styles.bottomContent, { opacity: fadeAnim }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  curveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  underline: {
    width: 70,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body1,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  bottomContent: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
});

export default SplashScreen;
