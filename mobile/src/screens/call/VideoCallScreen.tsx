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
import { RootStackParamList } from '../../@types';
import { CallControls } from '../../components/call/CallControls';
import { CallTimer } from '../../components/call/CallTimer';
import { useCallStore } from '../../store/callStore';
import { useSocketEvent } from '../../hooks/useSocket';
import * as socketService from '../../services/socketService';
import { colors, typography, spacing } from '../../styles/theme';
import { ENV } from '../../config/env';

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
  const clearCallState = useCallStore((state) => state.clearCallState);

  const agoraEngineRef = useRef<IRtcEngine | undefined>(undefined);
  const [remoteUid, setRemoteUid] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isJoined, setIsJoined] = useState(false);

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

  // Agora SDK 초기화
  useEffect(() => {
    const setupVideoSDK = async () => {
      try {
        console.log('🎥 Initializing Agora SDK...');
        console.log('Channel:', channelName);
        console.log('AGORA_APP_ID:', ENV.AGORA_APP_ID);

        // Agora Engine 생성
        agoraEngineRef.current = createAgoraRtcEngine();
        const agoraEngine = agoraEngineRef.current;

        // Agora 초기화
        agoraEngine.initialize({
          appId: ENV.AGORA_APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });

        // 이벤트 핸들러 등록
        agoraEngine.registerEventHandler({
          onJoinChannelSuccess: () => {
            console.log('✅ Successfully joined channel');
            setIsJoined(true);
          },
          onUserJoined: (_connection, uid) => {
            console.log('👤 Remote user joined:', uid);
            setRemoteUid(uid);
          },
          onUserOffline: (_connection, uid) => {
            console.log('👋 Remote user left:', uid);
            setRemoteUid(0);
          },
          onError: (err, msg) => {
            console.error('❌ Agora error:', err, msg);
          },
        });

        // 비디오 활성화 및 미리보기 시작
        agoraEngine.enableVideo();
        agoraEngine.startPreview();

        // 채널 참가
        console.log('🚀 Joining channel...');
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
  }, [channelName, token]);

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

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      >
        {/* 상대방 영상 (전체 화면) */}
        {remoteUid !== 0 ? (
          <RtcSurfaceView
            style={styles.remoteVideo}
            canvas={{ uid: remoteUid }}
          />
        ) : (
          <View style={styles.remoteVideo}>
            <Text style={styles.placeholder}>
              {isJoined ? '상대방 연결 대기 중...' : '연결 중...'}
            </Text>
          </View>
        )}

        {/* 내 영상 (PIP) */}
        <RtcSurfaceView
          style={styles.localVideo}
          canvas={{ uid: 0 }}
          zOrderMediaOverlay={true}
        />

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
            />
          </View>
        )}
      </TouchableOpacity>
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
