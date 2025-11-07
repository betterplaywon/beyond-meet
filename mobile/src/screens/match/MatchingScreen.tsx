/**
 * 매칭 대기 화면
 */

import React, { useEffect, useState } from 'react';
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
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../../@types';
import { Button } from '../../components/common/Button';
import { useCancelMatch } from '../../hooks/useMatch';
import { useSocket, useSocketEvent } from '../../hooks/useSocket';
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
  const socket = useSocket();
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // Socket 연결 상태 확인
  useEffect(() => {
    const checkConnection = setInterval(() => {
      setIsSocketConnected(socket.isConnected());
    }, 1000);

    return () => clearInterval(checkConnection);
  }, [socket]);

  // Socket 연결 안 됨 경고
  useEffect(() => {
    if (!isSocketConnected) {
      const timer = setTimeout(() => {
        Toast.show({
          type: 'error',
          text1: '연결 실패',
          text2: '서버와 연결할 수 없습니다. 네트워크를 확인해주세요.',
        });
        navigation.goBack();
      }, 10000); // 10초 후에도 연결 안 되면 에러

      return () => clearTimeout(timer);
    }
  }, [isSocketConnected, navigation]);

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

    Toast.show({
      type: 'success',
      text1: '매칭 성공!',
      text2: `${data.partner?.nickname || '상대방'}님과 연결되었습니다`,
    });

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
    Toast.show({
      type: 'error',
      text1: '매칭 실패',
      text2: data.message || '매칭에 실패했습니다. 다시 시도해주세요.',
    });
    navigation.goBack();
  });

  // 매칭 타임아웃 (2분)
  useEffect(() => {
    const timeout = setTimeout(() => {
      Toast.show({
        type: 'info',
        text1: '매칭 시간 초과',
        text2: '현재 매칭 가능한 사용자가 없습니다. 나중에 다시 시도해주세요.',
      });
      navigation.goBack();
    }, 120000); // 2분

    return () => clearTimeout(timeout);
  }, [navigation]);

  const handleCancel = () => {
    cancelMutation.mutate();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Socket 연결 상태 */}
        <View style={styles.connectionStatus}>
          <View
            style={[
              styles.connectionDot,
              { backgroundColor: isSocketConnected ? colors.success : colors.error },
            ]}
          />
          <Text style={styles.connectionText}>
            {isSocketConnected ? '서버 연결됨' : '연결 중...'}
          </Text>
        </View>

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
  connectionStatus: {
    position: 'absolute',
    top: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  connectionText: {
    ...typography.caption,
    color: colors.textSecondary,
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
