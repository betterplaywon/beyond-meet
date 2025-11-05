/**
 * 통화 종료 화면
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../@types';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { colors, typography, spacing } from '../../styles/theme';

type CallEndScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CallEnd'
>;
type CallEndScreenRouteProp = RouteProp<RootStackParamList, 'CallEnd'>;

interface Props {
  navigation: CallEndScreenNavigationProp;
  route: CallEndScreenRouteProp;
}

const CallEndScreen: React.FC<Props> = ({ navigation, route }) => {
  const { sessionId } = route.params;

  // TODO: 세션 정보 가져오기
  const callDuration = '04:32';
  const partner = {
    nickname: '상대방',
    profilePhoto: undefined,
  };

  const handleAddFriend = () => {
    // TODO: 친구 추가 API
    console.log('Adding friend');
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 성공 아이콘 */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✓</Text>
        </View>

        <Text style={styles.title}>통화가 종료되었습니다</Text>
        <Text style={styles.duration}>통화 시간: {callDuration}</Text>

        {/* 상대방 정보 */}
        <View style={styles.partnerContainer}>
          <Avatar
            source={partner.profilePhoto}
            name={partner.nickname}
            size="xlarge"
          />
          <Text style={styles.partnerName}>{partner.nickname}</Text>
        </View>

        {/* 액션 버튼 */}
        <View style={styles.actionsContainer}>
          <Button
            title="친구 추가하기"
            variant="secondary"
            fullWidth
            onPress={handleAddFriend}
          />
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
});

export default CallEndScreen;
