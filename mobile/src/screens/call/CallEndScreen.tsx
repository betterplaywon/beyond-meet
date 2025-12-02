/**
 * 통화 종료 화면
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../@types';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { colors, typography, spacing } from '../../styles/theme';
import { useAuthStore } from '../../store/authStore';
import { useAddFriend, useFriends } from '../../hooks/useFriends';
import { useSessionInfo } from '../../hooks/useCallHistory';
import { useCallStore } from '../../store/callStore';

type CallEndScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CallEnd'
>;
type CallEndScreenRouteProp = RouteProp<RootStackParamList, 'CallEnd'>;

interface Props {
  navigation: CallEndScreenNavigationProp;
  route: CallEndScreenRouteProp;
}

const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds === 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const CallEndScreen: React.FC<Props> = ({ navigation, route }) => {
  const { sessionId } = route.params;
  const userId = useAuthStore(state => state.userId);
  const callDuration = useCallStore(state => state.callDuration);

  // React Query hooks
  const { data: sessionInfo, isLoading: isSessionLoading } = useSessionInfo(sessionId);
  const { data: friendsList } = useFriends(userId || undefined);
  const addFriendMutation = useAddFriend();

  // 파생 상태: 이미 친구인지 확인 (useMemo로 계산)
  const isAlreadyFriend = useMemo(() => {
    return friendsList?.some(f => f.friendId === sessionInfo?.partner.id) ?? false;
  }, [friendsList, sessionInfo?.partner.id]);

  const handleAddFriend = () => {
    if (!userId || !sessionInfo) return;

    addFriendMutation.mutate(
      {
        userId,
        friendId: sessionInfo.partner.id,
      },
      {
        onSuccess: () => {
          Alert.alert('성공', `${sessionInfo.partner.nickname}님을 친구로 추가했습니다.`);
        },
        onError: (error: any) => {
          const message =
            error.response?.data?.error?.message || '친구 추가에 실패했습니다.';
          Alert.alert('오류', message);
        },
      },
    );
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  if (isSessionLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const partner = sessionInfo?.partner || {
    nickname: '상대방',
    profilePhotos: [],
  };

  // callStore의 duration 또는 세션 정보의 duration 사용
  const displayDuration = callDuration > 0
    ? formatDuration(callDuration)
    : formatDuration(sessionInfo?.session.duration || null);

  // friendAdded 상태 대신 mutation.isSuccess 사용
  const showAddFriendButton = !isAlreadyFriend && !addFriendMutation.isSuccess;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* 성공 아이콘 */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✓</Text>
        </View>

        <Text style={styles.title}>통화가 종료되었습니다</Text>
        <Text style={styles.duration}>통화 시간: {displayDuration}</Text>

        {/* 상대방 정보 */}
        <View style={styles.partnerContainer}>
          <Avatar
            source={partner.profilePhotos?.[0]}
            name={partner.nickname}
            size="xlarge"
          />
          <Text style={styles.partnerName}>{partner.nickname}</Text>
        </View>

        {/* 액션 버튼 */}
        <View style={styles.actionsContainer}>
          {showAddFriendButton && (
            <Button
              title={
                addFriendMutation.isPending ? '추가 중...' : '친구 추가하기'
              }
              variant="secondary"
              fullWidth
              onPress={handleAddFriend}
              disabled={addFriendMutation.isPending}
            />
          )}
          {isAlreadyFriend && (
            <View style={styles.alreadyFriendContainer}>
              <Text style={styles.alreadyFriendText}>이미 친구입니다</Text>
            </View>
          )}
          {addFriendMutation.isSuccess && (
            <View style={styles.friendAddedContainer}>
              <Text style={styles.friendAddedText}>친구로 추가되었습니다</Text>
            </View>
          )}
          <Button
            title="홈으로 돌아가기"
            variant="primary"
            fullWidth
            onPress={handleGoHome}
          />
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    ...typography.body1,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 60,
    color: colors.success,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  duration: {
    ...typography.body1,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  partnerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  partnerName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  actionsContainer: {
    width: '100%',
    gap: spacing.md,
  },
  alreadyFriendContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  alreadyFriendText: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  friendAddedContainer: {
    backgroundColor: colors.success + '20',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  friendAddedText: {
    ...typography.body1,
    color: colors.success,
  },
});

export default CallEndScreen;
