/**
 * 친구 목록 화면
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';

import { User, RootStackParamList } from '../../@types';
import { Avatar } from '../../components/common/Avatar';
import { useMyProfile } from '../../hooks/useProfile';
import { useFriends, useRemoveFriend } from '../../hooks/useFriends';
import { useFriendStatusSync } from '../../hooks/useFriendStatusSync';
import { useSocket, useSocketEvent } from '../../hooks/useSocket';
import * as socketService from '../../services/socketService';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing } from '../../styles/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

type FriendsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const FriendsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<FriendsScreenNavigationProp>();
  const { data: user } = useMyProfile();
  const isFocused = useIsFocused(); // 현재 탭이 포커스되어 있는지 확인
  const socket = useSocket();

  // 통화 요청 중인 친구 ID (로딩 상태 표시용)
  const [callingFriendId, setCallingFriendId] = useState<string | null>(null);

  // 삭제 확인 모달 상태
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState<User | null>(null);

  // 친구 삭제 mutation
  const removeFriendMutation = useRemoveFriend();

  // React Query로 친구 목록 조회
  const {
    data: friends = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useFriends(user?.id);

  // 친구 온라인 상태 실시간 동기화
  useFriendStatusSync(user?.id);

  // 통화 요청이 전송됨 (대기 중)
  useSocketEvent(
    'call:requested',
    (data: { sessionId: string; receiverId: string }) => {
      console.log('[FriendsScreen] Call requested:', data);
      // 요청이 전송되었음을 확인 (이미 로딩 상태)
    },
  );

  // 통화가 수락됨 - VideoCall 화면으로 이동
  useSocketEvent(
    'call:accepted',
    (data: {
      session: { id: string; channelName: string };
      token: string;
      uid: number;
    }) => {
      console.log('[FriendsScreen] Call accepted:', data);
      setCallingFriendId(null);
      navigation.navigate('VideoCall', {
        sessionId: data.session.id,
        channelName: data.session.channelName,
        token: data.token,
        uid: data.uid,
      });
    },
  );

  // 통화가 거절됨
  useSocketEvent('call:rejected', (data: { sessionId: string }) => {
    console.log('[FriendsScreen] Call rejected:', data);
    setCallingFriendId(null);
    Toast.show({
      type: 'info',
      text1: t('friends.callRejected'),
      text2: t('friends.callRejectedMessage'),
    });
  });

  // 매칭/통화 실패
  useSocketEvent('match:failed', (data: { reason: string }) => {
    console.log('[FriendsScreen] Match failed:', data);
    setCallingFriendId(null);
    Toast.show({
      type: 'error',
      text1: t('friends.callFailed'),
      text2: data.reason || t('friends.callFailedMessage'),
    });
  });

  // 네트워크 에러 등 실제 API 에러 발생 시에만 Alert 표시
  // 친구가 0명인 경우는 정상 응답(빈 배열)이므로 error가 null임
  // 단, 현재 탭이 포커스되어 있을 때만 Alert 표시 (다른 탭에서 에러 발생 방지)
  React.useEffect(() => {
    if (error && isFocused) {
      Alert.alert(t('common.error'), t('friends.loadError'));
    }
  }, [error, isFocused, t]);

  const handleRefresh = () => {
    refetch();
  };

  const handleCallFriend = (friend: User) => {
    // Socket 연결 상태 확인
    if (!socket.isConnected()) {
      Toast.show({
        type: 'error',
        text1: t('home.connectionError'),
        text2: t('home.serverDisconnected'),
      });
      return;
    }

    // 이미 통화 요청 중인 경우
    if (callingFriendId) {
      Toast.show({
        type: 'info',
        text1: t('friends.callRequesting'),
        text2: t('friends.alreadyCalling'),
      });
      return;
    }

    // 로딩 상태 설정 및 통화 요청
    setCallingFriendId(friend.id);
    socketService.requestDirectCall(friend.id);

    Toast.show({
      type: 'info',
      text1: t('friends.callRequesting'),
      text2: t('friends.callRequested', { nickname: friend.nickname }),
    });
  };

  // 삭제 버튼 클릭 시 모달 표시
  const handleDeletePress = (friend: User) => {
    setFriendToDelete(friend);
    setDeleteModalVisible(true);
  };

  // 삭제 확인
  const handleConfirmDelete = () => {
    if (!friendToDelete || !user?.id) return;

    removeFriendMutation.mutate(
      { userId: user.id, friendId: friendToDelete.id },
      {
        onSuccess: () => {
          Toast.show({
            type: 'success',
            text1: t('friends.deleteFriend'),
            text2: t('friends.deleted', { nickname: friendToDelete.nickname }),
          });
          setDeleteModalVisible(false);
          setFriendToDelete(null);
        },
      },
    );
  };

  // 삭제 취소
  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setFriendToDelete(null);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="people" size={80} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>{t('friends.empty')}</Text>
      <Text style={styles.emptyDescription}>
        {t('friends.emptySubtitle')}
      </Text>
    </View>
  );

  const renderFriend = ({ item }: { item: User }) => {
    const isCalling = callingFriendId === item.id;
    const isDisabled = item.onlineStatus !== 'ONLINE' || isCalling;

    return (
      <View style={styles.friendCard}>
        <Avatar
          source={item.profilePhotos?.[0]}
          name={item.nickname}
          size="medium"
          online={item.onlineStatus === 'ONLINE'}
        />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.nickname}</Text>
          <View style={styles.friendStatusContainer}>
            <Icon
              name={isCalling ? 'phone' : 'circle'}
              size={10}
              color={
                isCalling
                  ? colors.text
                  : item.onlineStatus === 'ONLINE'
                  ? colors.online
                  : colors.textTertiary
              }
              style={styles.statusIcon}
            />
            <Text style={styles.friendStatus}>
              {isCalling
                ? t('friends.calling')
                : item.onlineStatus === 'ONLINE'
                ? t('friends.online')
                : t('friends.offline')}
            </Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => handleCallFriend(item)}
            disabled={isDisabled}
            style={[
              styles.callButtonContainer,
              isDisabled && styles.callButtonDisabled,
            ]}
          >
            {isCalling ? (
              <ActivityIndicator size="small" color={colors.success} />
            ) : (
              <Icon name="phone" size={24} color={colors.success} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeletePress(item)}
            style={styles.deleteButtonContainer}
          >
            <Icon name="delete" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('friends.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {friends.length > 0 ? t('friends.count', { count: friends.length }) : ''}
        </Text>
      </View>

      {/* List */}
      {isLoading && friends.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('friends.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={item => item.id}
          renderItem={renderFriend}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* 친구 삭제 확인 모달 */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t('friends.deleteFriend')}</Text>
            <Text style={styles.modalMessage}>
              {t('friends.deleteConfirm', { nickname: friendToDelete?.nickname })}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCancelDelete}
              >
                <Text style={styles.modalButtonCancelText}>{t('common.no')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmDelete}
                disabled={removeFriendMutation.isPending}
              >
                {removeFriendMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>{t('common.yes')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  listContent: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  friendInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  friendName: {
    ...typography.body1Medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  friendStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: spacing.xs,
  },
  friendStatus: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  callButtonContainer: {
    padding: spacing.sm,
  },
  callButtonDisabled: {
    opacity: 0.3,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    ...typography.body1,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteButtonContainer: {
    padding: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalMessage: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.textTertiary,
  },
  modalButtonConfirm: {
    backgroundColor: colors.error,
  },
  modalButtonCancelText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  modalButtonConfirmText: {
    ...typography.button,
    color: colors.white,
  },
});

export default FriendsScreen;
