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
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  BackHandler,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
} from 'react-native-agora';
import RNFS from 'react-native-fs';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../@types';
import { CallControls } from '../../components/call/CallControls';
import { CallTimer } from '../../components/call/CallTimer';
import { useCallStore } from '../../store/callStore';
import { useSocketEvent } from '../../hooks/useSocket';
import * as socketService from '../../services/socketService';
import { colors, typography, spacing } from '../../styles/theme';
import { ENV } from '../../config/env';
import { ModerationWarningModal } from '../../components/moderation/ModerationWarningModal';
import api from '../../services/api';

type VideoCallScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'VideoCall'
>;
type VideoCallScreenRouteProp = RouteProp<RootStackParamList, 'VideoCall'>;

interface Props {
  navigation: VideoCallScreenNavigationProp;
  route: VideoCallScreenRouteProp;
}

const VideoCallScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { sessionId, channelName, token } = route.params;
  const insets = useSafeAreaInsets();

  if (!sessionId || !channelName || !token) {
    console.error('❌ Missing required params:', {
      sessionId: !!sessionId,
      channelName: !!channelName,
      token: !!token,
    });
    Alert.alert(t('common.error'), t('call.invalidInfo'), [
      { text: t('common.confirm'), onPress: () => navigation.goBack() },
    ]);
    return null;
  }

  const isJoined = useCallStore(state => state.isJoined);
  const setIsJoined = useCallStore(state => state.setIsJoined);
  const setCallDuration = useCallStore(state => state.setCallDuration);

  const agoraEngineRef = useRef<IRtcEngine | undefined>(undefined);
  const videoViewRef = useRef(null);
  const moderationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const isCallEndedRef = useRef(false);
  const remoteUidRef = useRef<number>(0);
  const [localUid, setLocalUid] = useState<number>(0);
  const [remoteUid, setRemoteUid] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const maxDuration = 300; // 5분

  // callStore에서 현재 통화 시간 읽기
  const callDuration = useCallStore(state => state.callDuration);

  // 스냅샷 Promise resolver를 저장하는 ref
  // Agora의 onSnapshotTaken 콜백이 비동기적으로 호출되므로,
  // Promise 패턴을 사용하여 콜백 완료를 await할 수 있게 함
  const snapshotResolverRef = useRef<{
    resolve: (filePath: string) => void;
    reject: (error: Error) => void;
  } | null>(null);

  // 프레임 캡처 및 AI 분석
  // Agora SDK의 takeSnapshot을 사용하여 원격 사용자의 비디오 스트림을 직접 캡처
  // 이 방식이 react-native-view-shot보다 안정적인 이유:
  // 1. 네이티브 레벨에서 비디오 스트림을 직접 캡처 (React Native 뷰 계층과 무관)
  // 2. RtcSurfaceView의 네이티브 렌더링 문제 회피
  // 3. 비디오 파이프라인에 최적화되어 성능 우수
  const captureAndAnalyzeFrame = useCallback(async () => {
    try {
      // 통화 종료 상태 체크
      if (isCallEndedRef.current) {
        return;
      }

      // remoteUid가 없으면 캡처할 필요 없음
      if (remoteUidRef.current === 0) {
        return;
      }

      // Agora 엔진이 없으면 캡처 불가
      if (!agoraEngineRef.current) {
        return;
      }

      // 임시 파일 경로 생성 (타임스탬프로 파일명 충돌 방지)
      const timestamp = Date.now();
      const filePath = `${RNFS.CachesDirectoryPath}/moderation_snapshot_${timestamp}.jpg`;

      // Promise를 생성하여 onSnapshotTaken 콜백 완료를 대기
      const snapshotPromise = new Promise<string>((resolve, reject) => {
        snapshotResolverRef.current = { resolve, reject };

        // 5초 타임아웃 설정
        setTimeout(() => {
          if (snapshotResolverRef.current) {
            snapshotResolverRef.current = null;
            reject(new Error('Snapshot timeout'));
          }
        }, 5000);
      });

      // Agora SDK의 takeSnapshot 호출
      const result = agoraEngineRef.current.takeSnapshot(
        remoteUidRef.current,
        filePath,
      );

      if (result !== 0) {
        snapshotResolverRef.current = null;
        return;
      }

      // onSnapshotTaken 콜백이 호출될 때까지 대기
      const capturedFilePath = await snapshotPromise;

      // 비동기 작업 후 다시 체크
      if (isCallEndedRef.current) {
        await RNFS.unlink(capturedFilePath).catch(() => {});
        return;
      }

      // 파일을 Base64로 변환
      const base64 = await RNFS.readFile(capturedFilePath, 'base64');
      const imageBase64 = `data:image/jpeg;base64,${base64}`;

      // 임시 파일 삭제 (디스크 공간 관리)
      await RNFS.unlink(capturedFilePath).catch(() => {});

      // 비동기 작업 후 다시 체크
      if (isCallEndedRef.current) {
        return;
      }

      // API 호출
      const response = await api.post('/moderation/analyze', {
        sessionId,
        imageBase64,
      });

      // API 응답 후 다시 체크
      if (isCallEndedRef.current) {
        return;
      }

      const { action } = response.data.data;

      // 액션 처리
      if (action === 'WARNING_ISSUED') {
        // Socket.io로 상대방에게 경고 전송
        socketService.sendModerationWarning(
          sessionId,
          remoteUidRef.current.toString(),
        );
      } else if (action === 'CALL_ENDED') {
        // 즉시 플래그 설정 및 interval 정리
        isCallEndedRef.current = true;
        if (moderationIntervalRef.current) {
          clearInterval(moderationIntervalRef.current);
          moderationIntervalRef.current = null;
        }

        // 강제 종료
        socketService.sendModerationForceEnd(sessionId);
        Alert.alert(
          t('call.ended'),
          t('call.endedByModeration'),
          [
            {
              text: t('common.confirm'),
              onPress: () => {
                navigation.replace('CallEnd', { sessionId });
              },
            },
          ],
        );
      }
    } catch {
      // 모더레이션 에러는 조용히 무시 (다음 프레임에서 재시도)
    }
  }, [sessionId, navigation, t]);

  // 모니터링 시작/중지
  useEffect(() => {
    // 조건이 맞지 않으면 기존 interval 정리
    if (!isJoined || remoteUid === 0) {
      if (moderationIntervalRef.current) {
        clearInterval(moderationIntervalRef.current);
        moderationIntervalRef.current = null;
      }
      return;
    }

    const interval = setInterval(() => {
      captureAndAnalyzeFrame();
    }, 4000); // 4초마다

    moderationIntervalRef.current = interval;

    return () => {
      if (moderationIntervalRef.current) {
        clearInterval(moderationIntervalRef.current);
        moderationIntervalRef.current = null;
      }
    };
  }, [isJoined, remoteUid, captureAndAnalyzeFrame]);

  // 상대방이 통화를 종료한 경우
  useSocketEvent('call:ended', (data: any) => {
    console.log('Call ended by other party:', data);

    // 즉시 플래그 설정 및 interval 정리 (Alert 대기 중 캡처 방지)
    isCallEndedRef.current = true;
    if (moderationIntervalRef.current) {
      clearInterval(moderationIntervalRef.current);
      moderationIntervalRef.current = null;
    }

    Alert.alert(t('call.ended'), t('call.endedByOther'), [
      {
        text: t('common.confirm'),
        onPress: () => {
          navigation.replace('CallEnd', { sessionId: data.sessionId });
        },
      },
    ]);
  });

  // 모니터링 경고 수신
  useSocketEvent('moderation:warning-received', (data: any) => {
    console.log('[MODERATION] Warning received:', data);
    setWarningMessage(
      data.message || t('moderation.warningMessage'),
    );
    setShowWarningModal(true);
  });

  // 모니터링 강제 종료 수신
  useSocketEvent('moderation:call-force-ended', (data: any) => {
    console.log('[MODERATION] Call force ended:', data);

    // 즉시 플래그 설정 및 interval 정리 (Alert 대기 중 캡처 방지)
    isCallEndedRef.current = true;
    if (moderationIntervalRef.current) {
      clearInterval(moderationIntervalRef.current);
      moderationIntervalRef.current = null;
    }

    Alert.alert(
      t('call.ended'),
      t('call.endedByModeration'),
      [
        {
          text: t('common.confirm'),
          onPress: () => {
            navigation.replace('CallEnd', { sessionId: data.sessionId });
          },
        },
      ],
    );
  });

  // Agora SDK 초기화
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          const grants = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);

          if (
            grants['android.permission.CAMERA'] !==
              PermissionsAndroid.RESULTS.GRANTED ||
            grants['android.permission.RECORD_AUDIO'] !==
              PermissionsAndroid.RESULTS.GRANTED
          ) {
            Alert.alert(t('call.permissionRequired'), t('call.permissionMessage'));
            return false;
          }
        } catch (err) {
          console.error('❌ Permission error:', err);
          return false;
        }
      }
      return true;
    };

    const setupVideoSDK = async () => {
      try {
        if (!ENV.AGORA_APP_ID) {
          Alert.alert(t('call.settingsError'), t('call.agoraNotConfigured'));
          return;
        }

        // 권한 요청
        const hasPermissions = await requestPermissions();
        if (!hasPermissions) {
          return;
        }

        // Agora Engine 생성
        agoraEngineRef.current = createAgoraRtcEngine();
        const agoraEngine = agoraEngineRef.current;

        // Agora 초기화
        agoraEngine.initialize({
          appId: ENV.AGORA_APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });

        // 자동 구독 활성화 (기본값이지만 명시적으로 설정)
        agoraEngine.muteAllRemoteAudioStreams(false);
        agoraEngine.muteAllRemoteVideoStreams(false);

        // 이벤트 핸들러 등록
        agoraEngine.registerEventHandler({
          onJoinChannelSuccess: (_connection, joinedUid) => {
            setLocalUid(joinedUid);
            setIsJoined(true);
          },
          onUserJoined: (_connection, remoteUserUid) => {
            remoteUidRef.current = remoteUserUid;
            setRemoteUid(remoteUserUid);
          },
          onUserOffline: () => {
            remoteUidRef.current = 0;
            setRemoteUid(0);
          },
          onError: (err, msg) => {
            Alert.alert(t('call.agoraError'), t('call.agoraErrorMessage', { err, msg }));
          },
          // 스냅샷 완료 콜백
          onSnapshotTaken: (
            _connection,
            _uid,
            filePath,
            _width,
            _height,
            errCode,
          ) => {
            if (snapshotResolverRef.current) {
              if (errCode === 0) {
                snapshotResolverRef.current.resolve(filePath);
              } else {
                snapshotResolverRef.current.reject(
                  new Error(`Snapshot failed with error code: ${errCode}`),
                );
              }
              snapshotResolverRef.current = null;
            }
          },
        });

        // 비디오 활성화 및 미리보기 시작
        agoraEngine.enableVideo();

        // Android: 비디오 인코더 설정
        if (Platform.OS === 'android') {
          agoraEngine.setVideoEncoderConfiguration({
            dimensions: { width: 640, height: 480 },
            frameRate: 15,
            bitrate: 0, // Standard bitrate
          });
        }

        agoraEngine.startPreview();

        // 채널 참가 (uid=0 → Agora 자동 할당)
        agoraEngine.joinChannel(token, channelName, 0, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        });
      } catch {
        Alert.alert(t('common.error'), t('call.startFailed'));
      }
    };

    setupVideoSDK();

    return () => {
      agoraEngineRef.current?.leaveChannel();
      agoraEngineRef.current?.release();
    };
  }, [channelName, token, setIsJoined, t]);

  // 타이머 로직 - callStore의 callDuration을 직접 업데이트
  useEffect(() => {
    // 초기화
    setCallDuration(0);

    const interval = setInterval(() => {
      // 현재 값을 store에서 직접 읽어서 업데이트
      const current = useCallStore.getState().callDuration;
      if (current >= maxDuration) {
        clearInterval(interval);
        return;
      }
      setCallDuration(current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [maxDuration, setCallDuration]);

  // 시간 초과 처리
  useEffect(() => {
    if (callDuration >= maxDuration) {
      handleTimeUp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callDuration, maxDuration]);

  // Android 하드웨어 백 버튼 처리 - 통화 중 뒤로가기 비활성화
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // true 반환 = 이벤트 소비, 기본 동작(뒤로가기) 방지
        // 통화 종료는 EndCall 버튼으로만 가능
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);

  const handleToggleMute = () => {
    agoraEngineRef.current?.muteLocalAudioStream(!isMuted);
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    agoraEngineRef.current?.muteLocalVideoStream(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  const handleSwitchCamera = () => {
    agoraEngineRef.current?.switchCamera();
  };

  const handleEndCall = () => {
    Alert.alert(t('call.ended'), t('call.endConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('call.end'),
        style: 'destructive',
        onPress: () => {
          // Socket으로 종료 이벤트 전송
          socketService.endCall(sessionId);
          navigation.replace('CallEnd', { sessionId });
        },
      },
    ]);
  };

  const handleTimeUp = () => {
    Alert.alert(t('call.timeUp'), t('call.timeUpMessage'));
    // Socket으로 종료 이벤트 전송
    socketService.endCall(sessionId);
    navigation.replace('CallEnd', { sessionId });
  };

  const handleReport = async () => {
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
          } catch (error) {
            console.error('[REPORT] Failed to submit report:', error);
            Alert.alert(t('common.error'), t('call.reportFailed'));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View ref={videoViewRef} style={styles.videoContainer}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setShowControls(!showControls)}
        >
          {/* 상대방 영상 (전체 화면) */}
          {remoteUid !== 0 ? (
            <RtcSurfaceView
              style={styles.remoteVideo}
              canvas={{
                uid: remoteUid,
                renderMode: 1, // Hidden (fit mode)
                mirrorMode: 0, // Auto
              }}
              zOrderOnTop={false}
            />
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
                renderMode: 1, // Hidden (fit mode)
                mirrorMode: 1, // Enabled (mirror for front camera)
              }}
              zOrderMediaOverlay={true}
              zOrderOnTop={true}
            />
          ) : (
            <View style={[styles.localVideo, { top: insets.top + 10 }]}>
              <Text style={styles.localPlaceholder}>{t('match.connecting')}</Text>
            </View>
          )}

          {/* 타이머 - 항상 마운트, visibility만 제어 */}
          <View
            style={[
              styles.timerContainer,
              { top: insets.top + 10 },
              !showControls && styles.hidden,
            ]}
          >
            <CallTimer elapsed={callDuration} maxDuration={maxDuration} />
          </View>

          {/* 컨트롤 */}
          {showControls && (
            <View style={styles.controlsContainer}>
              <CallControls
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                onToggleMute={handleToggleMute}
                onToggleVideo={handleToggleVideo}
                onSwitchCamera={handleSwitchCamera}
                onEndCall={handleEndCall}
                onReport={handleReport}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 모니터링 경고 모달 */}
      <ModerationWarningModal
        visible={showWarningModal}
        onClose={() => setShowWarningModal(false)}
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
  placeholder: {
    ...typography.h3,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  placeholderNote: {
    ...typography.body2,
    color: colors.white + '80',
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
  hidden: {
    opacity: 0,
  },
});

export default VideoCallScreen;
