/**
 * 영상 통화 화면
 *
 * Agora SDK를 사용하여 실시간 영상 통화를 제공합니다.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RtcSurfaceView, RtcTextureView } from 'react-native-agora';
import ViewShot from 'react-native-view-shot';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../@types';
import { CallControls } from '../../components/call/CallControls';
import { CallTimer } from '../../components/call/CallTimer';
import { useCallStore } from '../../store/callStore';
import { ModerationWarningModal } from '../../components/moderation/ModerationWarningModal';
import api from '../../services/api';
import { colors, typography, spacing } from '../../styles/theme';
import {
  useCallEnd,
  useAgoraEngine,
  useCallTimer,
  useModeration,
  useCallSocketEvents,
} from '../../hooks/call';

type VideoCallScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'VideoCall'
>;
type VideoCallScreenRouteProp = RouteProp<RootStackParamList, 'VideoCall'>;

interface Props {
  navigation: VideoCallScreenNavigationProp;
  route: VideoCallScreenRouteProp;
}

const MAX_DURATION = 300; // 5분

const VideoCallScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { sessionId, channelName, token, uid: serverUid, partnerId } = route.params;
  const insets = useSafeAreaInsets();
  const isJoined = useCallStore(state => state.isJoined);

  // showControls: Animated.Value로 JS 리렌더 없이 네이티브 레벨 opacity 제어
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const controlsVisible = useRef(true);

  // 원격 비디오 캡처를 위한 ref
  const remoteVideoRef = useRef<ViewShot>(null);

  const toggleControls = useCallback(() => {
    controlsVisible.current = !controlsVisible.current;
    Animated.timing(controlsOpacity, {
      toValue: controlsVisible.current ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [controlsOpacity]);

  // 1. 통화 종료 중앙 관리
  const { isCallEndedRef, endCall, registerCleanup } = useCallEnd({
    sessionId,
    navigation,
  });

  // 2. Agora SDK
  const { localUid, remoteUidRef, isRemoteJoined, controls } = useAgoraEngine({
    channelName,
    token,
    serverUid,
  });

  // 3. 타이머
  const { callDuration } = useCallTimer({
    maxDuration: MAX_DURATION,
    onTimeUp: () => endCall({ reason: 'timeUp', emitSocket: true }),
    enabled: isJoined,
  });

  // 4. AI 모더레이션
  console.log('[VideoCallScreen] Moderation params:', {
    sessionId,
    partnerId,
    isJoined,
    isRemoteJoined,
    hasRemoteVideoRef: !!remoteVideoRef.current,
  });

  const { cleanup: moderationCleanup } = useModeration({
    sessionId,
    partnerId,
    isCallEndedRef,
    remoteVideoRef,
    isRemoteJoined,
    isJoined,
    onCallForceEnd: () =>
      endCall({
        reason: 'moderation',
        alertTitle: t('call.ended'),
        alertMessage: t('call.endedByModeration'),
      }),
  });

  // cleanup 등록
  useEffect(() => {
    registerCleanup(moderationCleanup);
  }, [registerCleanup, moderationCleanup]);

  // 5. 소켓 이벤트
  const { showWarningModal, warningMessage, dismissWarning } =
    useCallSocketEvents({
      endCall,
      moderationCleanup,
    });

  // Android 뒤로가기 비활성화
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const handler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => handler.remove();
  }, []);

  // 컨트롤 상태 (CallControls에만 영향)
  const [controlState, setControlState] = useState({
    isMuted: false,
    isVideoOff: false,
  });

  const handleToggleMute = useCallback(() => {
    setControlState(prev => {
      const newMuted = !prev.isMuted;
      controls.muteAudio(newMuted);
      return { ...prev, isMuted: newMuted };
    });
  }, [controls]);

  const handleToggleVideo = useCallback(() => {
    setControlState(prev => {
      const newVideoOff = !prev.isVideoOff;
      controls.muteVideo(newVideoOff);
      return { ...prev, isVideoOff: newVideoOff };
    });
  }, [controls]);

  const handleSwitchCamera = useCallback(() => {
    controls.switchCamera();
  }, [controls]);

  const handleEndCall = useCallback(() => {
    Alert.alert(t('call.ended'), t('call.endConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('call.end'),
        style: 'destructive',
        onPress: () => endCall({ reason: 'user', emitSocket: true }),
      },
    ]);
  }, [t, endCall]);

  const handleReport = useCallback(async () => {
    Alert.alert(t('call.report'), t('call.reportConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('call.report'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/moderation/report', {
              sessionId,
              reason: 'INAPPROPRIATE_CONTENT',
              description: '사용자가 직접 신고',
            });
            Alert.alert(t('call.reportDone'), t('call.reportSuccess'));
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            console.error('[REPORT] Failed to submit report:', message);
            Alert.alert(t('common.error'), t('call.reportFailed'));
          }
        },
      },
    ]);
  }, [t, sessionId]);

  // 필수 파라미터 검증
  if (!sessionId || !channelName || !token) {
    console.error('Missing required params:', {
      sessionId: !!sessionId,
      channelName: !!channelName,
      token: !!token,
    });
    Alert.alert(t('common.error'), t('call.invalidInfo'), [
      { text: t('common.confirm'), onPress: () => navigation.goBack() },
    ]);
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoContainer}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={toggleControls}
        >
          {/* 상대방 영상 (전체 화면) */}
          {/* Android: TextureView 사용 (ViewShot 캡처 가능) */}
          {/* iOS: SurfaceView 사용 (TextureView 미지원) */}
          {isRemoteJoined ? (
            <ViewShot
              ref={remoteVideoRef}
              style={styles.remoteVideo}
              options={{ format: 'jpg', quality: 0.8 }}
            >
              {Platform.OS === 'android' ? (
                <RtcTextureView
                  style={styles.remoteVideoInner}
                  canvas={{
                    uid: remoteUidRef.current,
                    renderMode: 1,
                    mirrorMode: 0,
                  }}
                />
              ) : (
                <RtcSurfaceView
                  style={styles.remoteVideoInner}
                  canvas={{
                    uid: remoteUidRef.current,
                    renderMode: 1,
                    mirrorMode: 0,
                  }}
                  zOrderOnTop={false}
                />
              )}
            </ViewShot>
          ) : (
            <View style={styles.remoteVideo}>
              <Text style={styles.placeholder}>
                {isJoined ? t('call.waitingForOther') : t('match.connecting')}
              </Text>
            </View>
          )}

          {/* 내 영상 (PIP) */}
          {localUid !== 0 ? (
            <RtcSurfaceView
              style={[styles.localVideo, { top: insets.top + 10 }]}
              canvas={{
                uid: 0,
                renderMode: 1,
                mirrorMode: 1,
              }}
              zOrderMediaOverlay={true}
              zOrderOnTop={true}
            />
          ) : (
            <View style={[styles.localVideo, { top: insets.top + 10 }]}>
              <Text style={styles.localPlaceholder}>
                {t('match.connecting')}
              </Text>
            </View>
          )}

          {/* 타이머 */}
          <Animated.View
            style={[
              styles.timerContainer,
              { top: insets.top + 10, opacity: controlsOpacity },
            ]}
          >
            <CallTimer elapsed={callDuration} maxDuration={MAX_DURATION} />
          </Animated.View>

          {/* 컨트롤 */}
          <Animated.View
            style={[styles.controlsContainer, { opacity: controlsOpacity }]}
            pointerEvents={controlsVisible.current ? 'auto' : 'none'}
          >
            <CallControls
              isMuted={controlState.isMuted}
              isVideoOff={controlState.isVideoOff}
              onToggleMute={handleToggleMute}
              onToggleVideo={handleToggleVideo}
              onSwitchCamera={handleSwitchCamera}
              onEndCall={handleEndCall}
              onReport={handleReport}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* 모니터링 경고 모달 */}
      <ModerationWarningModal
        visible={showWarningModal}
        onClose={dismissWarning}
        message={warningMessage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  videoContainer: {
    flex: 1,
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteVideoInner: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...typography.h3,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  localVideo: {
    position: 'absolute',
    right: 20,
    width: 120,
    height: 160,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  localPlaceholder: {
    ...typography.caption,
    color: colors.white,
  },
  timerContainer: {
    position: 'absolute',
    left: 20,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default VideoCallScreen;
