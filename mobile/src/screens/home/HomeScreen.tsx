/**
 * 홈 화면
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import { Button } from '../../components/common/Button';
import { IncomingCallModal } from '../../components/call/IncomingCallModal';
import { useCallStore } from '../../store/callStore';
import { useSocket, useSocketEvent } from '../../hooks/useSocket';
import { useMyProfile } from '../../hooks/useProfile';
import * as socketService from '../../services/socketService';
import { RootStackParamList } from '../../@types';
import { colors, typography, spacing } from '../../styles/theme';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { data: user } = useMyProfile();
  const socket = useSocket();

  const incomingCall = useCallStore((state) => state.incomingCall);
  const setIncomingCall = useCallStore((state) => state.setIncomingCall);
  const [showIncomingCall, setShowIncomingCall] = useState(false);

  // 통화 수신 이벤트
  useSocketEvent('call:incoming', (data: any) => {
    console.log('Incoming call:', data);
    setIncomingCall({
      session: data.session,
      caller: data.caller,
    });
    setShowIncomingCall(true);
  });

  // 통화 수락 완료 이벤트 (토큰 및 UID 받기)
  useSocketEvent('call:accepted', (data: any) => {
    if (data.token && data.uid) {
      console.log('Call accepted, received token and UID:', data.uid);
      // 토큰과 UID를 받았으니 VideoCall 화면으로 이동
      navigation.navigate('VideoCall', {
        sessionId: data.session.id,
        channelName: data.session.channelName,
        token: data.token,
        uid: data.uid,
      });
      setIncomingCall(null);
    }
  });

  const handleRandomMatch = () => {
    // Socket 연결 상태 확인
    if (!socket.isConnected()) {
      Toast.show({
        type: 'error',
        text1: '연결 오류',
        text2: '서버와 연결되지 않았습니다. 다시 시도해주세요.',
      });
      return;
    }

    // Socket으로 매칭 요청
    socket.emit('match:request', { type: 'RANDOM' });

    // 매칭 대기 화면으로 이동
    navigation.navigate('Matching');
  };

  const handleAcceptCall = () => {
    if (!incomingCall) return;

    setShowIncomingCall(false);
    // Socket으로 수락 이벤트 전송 (call:accepted 이벤트로 토큰 받음)
    socketService.acceptCall(incomingCall.session.id);
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;

    setShowIncomingCall(false);
    socketService.rejectCall(incomingCall.session.id);
    setIncomingCall(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 통화 수신 모달 */}
      <IncomingCallModal
        visible={showIncomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Beyond Meet</Text>
        <Text style={styles.headerSubtitle}>
          {user?.nickname}님, 환영합니다!
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.matchContainer}>
          <Text style={styles.matchIcon}>💕</Text>
          <Text style={styles.matchTitle}>새로운 사람을{'\n'}만나보세요</Text>
          <Text style={styles.matchDescription}>
            랜덤 매칭을 통해 새로운 친구를 만나보세요
          </Text>

          <Button
            title="랜덤 매칭 시작하기"
            variant="primary"
            size="large"
            onPress={handleRandomMatch}
            style={styles.matchButton}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>오늘의 통화</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>친구</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>총 통화 시간</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  matchContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  matchIcon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  matchTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  matchDescription: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  matchButton: {
    minWidth: 200,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.textSecondary + '20',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.textSecondary + '20',
  },
});

export default HomeScreen;
