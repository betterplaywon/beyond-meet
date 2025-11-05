/**
 * 영상 통화 화면
 *
 * 주의: Agora SDK의 실제 구현은 네이티브 설정이 필요합니다.
 * 현재는 UI 구조만 구현되어 있으며, 실제 Agora 연동은 추가 작업이 필요합니다.
 */

import React, { useState, useEffect } from 'react';
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
import { RootStackParamList } from '../../@types';
import { CallControls } from '../../components/call/CallControls';
import { CallTimer } from '../../components/call/CallTimer';
import { useCallStore } from '../../store/callStore';
import { colors, typography, spacing } from '../../styles/theme';

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

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // TODO: Agora SDK 초기화
  useEffect(() => {
    // Agora 초기화 로직
    console.log('Initializing Agora with:', {
      sessionId,
      channelName,
      token,
    });

    return () => {
      // Agora 정리
      console.log('Cleaning up Agora');
    };
  }, [sessionId, channelName, token]);

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    // TODO: Agora muteLocalAudioStream
  };

  const handleToggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    // TODO: Agora muteLocalVideoStream
  };

  const handleSwitchCamera = () => {
    // TODO: Agora switchCamera
    console.log('Switching camera');
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
            clearCallState();
            navigation.replace('CallEnd', { sessionId });
          },
        },
      ]
    );
  };

  const handleTimeUp = () => {
    Alert.alert('시간 종료', '5분이 경과하여 통화가 종료됩니다.');
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
        <View style={styles.remoteVideo}>
          <Text style={styles.placeholder}>상대방 영상 영역</Text>
          <Text style={styles.placeholderNote}>
            (Agora SDK 연동 후 표시됩니다)
          </Text>
        </View>

        {/* 내 영상 (PIP) */}
        <View style={styles.localVideo}>
          <Text style={styles.localPlaceholder}>내 영상</Text>
        </View>

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
