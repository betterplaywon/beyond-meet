/**
 * 매칭 대기 화면
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../@types';
import { Button } from '../../components/common/Button';
import { useCancelMatch } from '../../hooks/useMatch';
import { useSocketEvent } from '../../hooks/useSocket';
import { useCallStore } from '../../store/callStore';
import { colors, typography, spacing } from '../../styles/theme';

type MatchingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Matching'
>;
type MatchingScreenRouteProp = RouteProp<RootStackParamList, 'Matching'>;

interface Props {
  navigation: MatchingScreenNavigationProp;
  route: MatchingScreenRouteProp;
}

const MatchingScreen: React.FC<Props> = ({ navigation }) => {
  const cancelMutation = useCancelMatch();
  const setCurrentSession = useCallStore((state) => state.setCurrentSession);

  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // 맥박 애니메이션
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [scaleAnim]);

  // 매칭 성공 이벤트 리스너
  useSocketEvent('match:found', (data: any) => {
    console.log('Match found:', data);
    setCurrentSession(data.session);

    // VideoCallScreen으로 이동
    navigation.replace('VideoCall', {
      sessionId: data.session.id,
      channelName: data.session.channelName,
      token: data.token,
    });
  });

  // 매칭 실패 이벤트
  useSocketEvent('match:failed', (data: any) => {
    console.log('Match failed:', data);
    navigation.goBack();
  });

  const handleCancel = () => {
    cancelMutation.mutate();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 애니메이션 아이콘 */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.icon}>💕</Text>
        </Animated.View>

        <Text style={styles.title}>매칭 중입니다...</Text>
        <Text style={styles.subtitle}>새로운 사람을 찾고 있어요</Text>

        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 매칭 팁</Text>
          <Text style={styles.tip}>• 밝은 곳에서 통화하세요</Text>
          <Text style={styles.tip}>• 예의 바른 대화를 나눠요</Text>
          <Text style={styles.tip}>• 5분간 즐거운 대화를!</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="취소"
          variant="outline"
          fullWidth
          onPress={handleCancel}
          loading={cancelMutation.isPending}
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
  iconContainer: {
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 100,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  tipsContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.xl,
    width: '100%',
  },
  tipsTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tip: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  footer: {
    padding: spacing.xl,
  },
});

export default MatchingScreen;
