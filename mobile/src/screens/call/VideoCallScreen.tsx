/**
 * 영상 통화 화면
 *
 * Agora SDK를 사용하여 실시간 영상 통화를 제공합니다.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
} from 'react-native-agora';
import { captureRef } from 'react-native-view-shot';
import RNFS from 'react-native-fs';
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
  const { sessionId, channelName, token } = route.params;
  // uid는 백엔드에서 전달되지만 사용하지 않음 (Agora 자동 할당)

  // Route params 검증 및 로깅
  console.log('🎬 VideoCallScreen initialized with params:', {
    sessionId,
    channelName,
    token: token?.substring(0, 20) + '...',
    tokenLength: token?.length,
  });

  if (!sessionId || !channelName || !token) {
    console.error('❌ Missing required params:', {
      sessionId: !!sessionId,
      channelName: !!channelName,
      token: !!token,
    });
    Alert.alert('오류', '통화 정보가 올바르지 않습니다.', [
      { text: '확인', onPress: () => navigation.goBack() },
    ]);
  }

  const clearCallState = useCallStore((state) => state.clearCallState);
  const isJoined = useCallStore((state) => state.isJoined);
  const setIsJoined = useCallStore((state) => state.setIsJoined);

  const agoraEngineRef = useRef<IRtcEngine | undefined>(undefined);
  const videoViewRef = useRef(null);
  const moderationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [localUid, setLocalUid] = useState<number>(0);
  const [remoteUid, setRemoteUid] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // remoteUid 상태 변경 모니터링
  useEffect(() => {
    console.log('🎯 [STATE] remoteUid changed:', remoteUid);
    if (remoteUid !== 0) {
      console.log('✅ [RENDER] Remote video should be visible now with UID:', remoteUid);
    } else {
      console.log('⏸️ [RENDER] Showing placeholder (waiting for remote user)');
    }
  }, [remoteUid]);

  // localUid 상태 변경 모니터링
  useEffect(() => {
    console.log('🎯 [STATE] localUid changed:', localUid);
    if (localUid !== 0) {
      console.log('✅ [RENDER] Local video (PIP) should be visible now with UID:', localUid);
    }
  }, [localUid]);

  // 프레임 캡처 및 AI 분석
  const captureAndAnalyzeFrame = async () => {
    try {
      if (!videoViewRef.current) {
        console.log('[MODERATION] Video view ref not available');
        return;
      }

      // 화면 캡처
      const uri = await captureRef(videoViewRef, {
        format: 'jpg',
        quality: 0.8,
        width: 640,
        height: 480,
      });

      // Base64 변환
      const base64 = await RNFS.readFile(uri, 'base64');
      const imageBase64 = `data:image/jpeg;base64,${base64}`;

      console.log('[MODERATION] Frame captured, sending to API...');

      // API 호출
      const response = await api.post('/moderation/analyze', {
        sessionId,
        imageBase64,
      });

      const { confidence, action } = response.data.data;
      console.log('[MODERATION] Analysis result:', { confidence, action });

      // 액션 처리
      if (action === 'WARNING_ISSUED') {
        // Socket.io로 상대방에게 경고 전송
        socketService.sendModerationWarning(sessionId, remoteUid.toString());
      } else if (action === 'CALL_ENDED') {
        // 강제 종료
        socketService.sendModerationForceEnd(sessionId);
        Alert.alert(
          '통화 종료',
          '부적절한 콘텐츠가 감지되어 통화가 종료되었습니다.',
          [
            {
              text: '확인',
              onPress: () => {
                clearCallState();
                navigation.replace('CallEnd', { sessionId });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('[MODERATION] Frame analysis failed:', error);
      if (error.response?.data?.error?.code === 'IMAGE_TOO_SMALL') {
        console.warn('[MODERATION] Image too small, skipping this frame');
      }
    }
  };

  // 모니터링 시작/중지
  useEffect(() => {
    if (isJoined && remoteUid !== 0) {
      console.log('[MODERATION] Starting monitoring interval (4 seconds)');
      const interval = setInterval(() => {
        captureAndAnalyzeFrame();
      }, 4000); // 4초마다

      moderationIntervalRef.current = interval;

      return () => {
        if (moderationIntervalRef.current) {
          console.log('[MODERATION] Stopping monitoring interval');
          clearInterval(moderationIntervalRef.current);
        }
      };
    }
  }, [isJoined, remoteUid]);

  // 상대방이 통화를 종료한 경우
  useSocketEvent('call:ended', (data: any) => {
    console.log('Call ended by other party:', data);
    Alert.alert('통화 종료', '상대방이 통화를 종료했습니다.', [
      {
        text: '확인',
        onPress: () => {
          clearCallState();
          navigation.replace('CallEnd', { sessionId: data.sessionId });
        },
      },
    ]);
  });

  // 모니터링 경고 수신
  useSocketEvent('moderation:warning-received', (data: any) => {
    console.log('[MODERATION] Warning received:', data);
    setWarningMessage(data.message || '부적절한 행동이 감지되었습니다.\n반복될 경우 통화가 종료될 수 있습니다.');
    setShowWarningModal(true);
  });

  // 모니터링 강제 종료 수신
  useSocketEvent('moderation:call-force-ended', (data: any) => {
    console.log('[MODERATION] Call force ended:', data);
    Alert.alert(
      '통화 종료',
      '부적절한 콘텐츠가 감지되어 통화가 종료되었습니다.',
      [
        {
          text: '확인',
          onPress: () => {
            clearCallState();
            navigation.replace('CallEnd', { sessionId: data.sessionId });
          },
        },
      ]
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
            grants['android.permission.CAMERA'] !== PermissionsAndroid.RESULTS.GRANTED ||
            grants['android.permission.RECORD_AUDIO'] !== PermissionsAndroid.RESULTS.GRANTED
          ) {
            console.error('❌ Permissions not granted');
            Alert.alert('권한 필요', '카메라와 마이크 권한이 필요합니다.');
            return false;
          }
          console.log('✅ Android permissions granted');
        } catch (err) {
          console.error('❌ Permission error:', err);
          return false;
        }
      }
      return true;
    };

    const setupVideoSDK = async () => {
      try {
        console.log('🎥 Initializing Agora SDK...');
        console.log('Channel:', channelName);
        console.log('AGORA_APP_ID:', ENV.AGORA_APP_ID);

        if (!ENV.AGORA_APP_ID) {
          console.error('❌ AGORA_APP_ID is empty!');
          Alert.alert('설정 오류', 'Agora App ID가 설정되지 않았습니다.');
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
        console.log('🔧 Configuring channel media options...');
        agoraEngine.muteAllRemoteAudioStreams(false);
        agoraEngine.muteAllRemoteVideoStreams(false);

        // 이벤트 핸들러 등록
        agoraEngine.registerEventHandler({
          onJoinChannelSuccess: (_connection, joinedUid) => {
            console.log('✅ Successfully joined channel with UID:', joinedUid);
            console.log('📋 Channel:', channelName);
            console.log('🆔 Agora assigned UID:', joinedUid);
            setLocalUid(joinedUid);
            setIsJoined(true);
          },
          onUserJoined: (_connection, remoteUserUid) => {
            console.log('👤 Remote user joined:', remoteUserUid);
            console.log('📹 Remote UID:', remoteUserUid);
            console.log('🔄 Setting remoteUid state to:', remoteUserUid);
            setRemoteUid(remoteUserUid);

            // 상태 업데이트 확인을 위한 지연 로그
            setTimeout(() => {
              console.log('✔️ RemoteUid state should be updated now');
            }, 100);
          },
          onUserOffline: (_connection, remoteUserUid) => {
            console.log('👋 Remote user left:', remoteUserUid);
            setRemoteUid(0);
          },
          onRemoteVideoStateChanged: (_connection, remoteUserUid, state, reason) => {
            console.log('📹 Remote video state changed:', {
              uid: remoteUserUid,
              state,
              reason,
              stateDescription: state === 0 ? 'Stopped' : state === 1 ? 'Starting' : state === 2 ? 'Decoding' : state === 3 ? 'Frozen' : 'Failed',
            });

            // state=2 (Decoding)이면 비디오가 정상적으로 수신되고 있음
            if (state === 2) {
              console.log('✅ Remote video is being decoded - should be visible!');
            }
          },
          onLocalVideoStateChanged: (_connection, state, reason) => {
            console.log('📹 Local video state changed:', {
              state,
              reason,
            });
          },
          onError: (err, msg) => {
            console.error('❌ Agora error:', err, msg);
            Alert.alert('Agora 오류', `에러 코드: ${err}\n메시지: ${msg}`);
          },
        });

        // 비디오 활성화 및 미리보기 시작
        console.log('📹 Enabling video and starting preview...');
        agoraEngine.enableVideo();

        // Android: 비디오 인코더 설정
        if (Platform.OS === 'android') {
          agoraEngine.setVideoEncoderConfiguration({
            dimensions: { width: 640, height: 480 },
            frameRate: 15,
            bitrate: 0, // Standard bitrate
          });
          console.log('🤖 Android video encoder configured');
        }

        agoraEngine.startPreview();

        // 채널 참가
        // ⚠️ 해결책: UID를 0으로 전달하여 Agora가 자동으로 UID를 할당하도록 함
        // 토큰도 uid=0으로 생성되어 모든 자동 할당 UID에 대해 유효함
        console.log('🚀 Joining channel:', {
          channelName,
          token: token.substring(0, 20) + '...',
          uid: 0, // Agora 자동 할당
        });

        // joinChannel(token, channelName, uid, options)
        // uid=0 전달 → Agora가 자동으로 고유 UID 할당
        agoraEngine.joinChannel(token, channelName, 0, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        });
      } catch (error) {
        console.error('❌ Agora setup error:', error);
        Alert.alert('오류', '영상 통화를 시작할 수 없습니다.');
      }
    };

    setupVideoSDK();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up Agora SDK...');
      agoraEngineRef.current?.leaveChannel();
      agoraEngineRef.current?.release();
    };
  }, [channelName, token, setIsJoined]);

  const handleToggleMute = () => {
    agoraEngineRef.current?.muteLocalAudioStream(!isMuted);
    setIsMuted(!isMuted);
    console.log(isMuted ? '🔊 Unmuted' : '🔇 Muted');
  };

  const handleToggleVideo = () => {
    agoraEngineRef.current?.muteLocalVideoStream(!isVideoOff);
    setIsVideoOff(!isVideoOff);
    console.log(isVideoOff ? '📹 Video On' : '📵 Video Off');
  };

  const handleSwitchCamera = () => {
    agoraEngineRef.current?.switchCamera();
    console.log('🔄 Switching camera');
  };

  const handleEndCall = () => {
    Alert.alert(
      '통화 종료',
      '통화를 종료하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '종료',
          style: 'destructive',
          onPress: () => {
            // Socket으로 종료 이벤트 전송
            socketService.endCall(sessionId);
            clearCallState();
            navigation.replace('CallEnd', { sessionId });
          },
        },
      ]
    );
  };

  const handleTimeUp = () => {
    Alert.alert('시간 종료', '5분이 경과하여 통화가 종료됩니다.');
    // Socket으로 종료 이벤트 전송
    socketService.endCall(sessionId);
    clearCallState();
    navigation.replace('CallEnd', { sessionId });
  };

  const handleReport = async () => {
    Alert.alert(
      '신고하기',
      '이 사용자를 신고하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '신고',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/moderation/report', {
                sessionId,
                reason: 'INAPPROPRIATE_CONTENT',
                description: '사용자가 직접 신고',
              });
              Alert.alert('신고 완료', '신고가 접수되었습니다.');
            } catch (error) {
              console.error('[REPORT] Failed to submit report:', error);
              Alert.alert('오류', '신고 접수에 실패했습니다.');
            }
          },
        },
      ]
    );
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
              {isJoined ? '상대방 연결 대기 중...' : '연결 중...'}
            </Text>
          </View>
        )}

        {/* 내 영상 (PIP) */}
        {localUid !== 0 ? (
          <RtcSurfaceView
            style={styles.localVideo}
            canvas={{
              uid: 0,
              renderMode: 1, // Hidden (fit mode)
              mirrorMode: 1, // Enabled (mirror for front camera)
            }}
            zOrderMediaOverlay={true}
            zOrderOnTop={true}
          />
        ) : (
          <View style={styles.localVideo}>
            <Text style={styles.localPlaceholder}>연결 중...</Text>
          </View>
        )}

        {/* 타이머 */}
        {showControls && (
          <View style={styles.timerContainer}>
            <CallTimer maxDuration={300} onTimeUp={handleTimeUp} />
          </View>
        )}

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
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  localPlaceholder: {
    ...typography.caption,
    color: colors.white,
  },
  timerContainer: {
    position: 'absolute',
    top: 20,
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
