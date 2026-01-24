import { useState, useEffect, useRef, useMemo } from 'react';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
} from 'react-native-agora';
import { useTranslation } from 'react-i18next';
import { useCallStore } from '../../store/callStore';
import { ENV } from '../../config/env';

interface UseAgoraEngineParams {
  channelName: string;
  token: string;
  serverUid: number;
}

export const useAgoraEngine = ({
  channelName,
  token,
  serverUid,
}: UseAgoraEngineParams) => {
  const { t } = useTranslation();
  const engineRef = useRef<IRtcEngine | undefined>(undefined);
  const remoteUidRef = useRef<number>(0);
  const snapshotResolverRef = useRef<{
    resolve: (filePath: string) => void;
    reject: (error: Error) => void;
  } | null>(null);

  const [localUid, setLocalUid] = useState<number>(0);
  const [isRemoteJoined, setIsRemoteJoined] = useState(false);
  const setIsJoined = useCallStore(state => state.setIsJoined);

  useEffect(() => {
    const requestPermissions = async (): Promise<boolean> => {
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
            Alert.alert(
              t('call.permissionRequired'),
              t('call.permissionMessage'),
            );
            return false;
          }
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          console.error('[AGORA] Permission error:', message);
          return false;
        }
      }
      return true;
    };

    const setupVideoSDK = async () => {
      try {
        if (!ENV.AGORA_APP_ID) {
          Alert.alert(
            t('call.settingsError'),
            t('call.agoraNotConfigured'),
          );
          return;
        }

        const hasPermissions = await requestPermissions();
        if (!hasPermissions) return;

        engineRef.current = createAgoraRtcEngine();
        const agoraEngine = engineRef.current;

        agoraEngine.initialize({
          appId: ENV.AGORA_APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });

        agoraEngine.muteAllRemoteAudioStreams(false);
        agoraEngine.muteAllRemoteVideoStreams(false);

        agoraEngine.registerEventHandler({
          onJoinChannelSuccess: (_connection, joinedUid) => {
            setLocalUid(joinedUid);
            setIsJoined(true);
          },
          onUserJoined: (_connection, remoteUserUid) => {
            remoteUidRef.current = remoteUserUid;
            setIsRemoteJoined(true);
          },
          onUserOffline: () => {
            remoteUidRef.current = 0;
            setIsRemoteJoined(false);
          },
          onError: (err, msg) => {
            Alert.alert(
              t('call.agoraError'),
              t('call.agoraErrorMessage', { err, msg }),
            );
          },
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

        agoraEngine.enableVideo();

        if (Platform.OS === 'android') {
          agoraEngine.setVideoEncoderConfiguration({
            dimensions: { width: 640, height: 480 },
            frameRate: 15,
            bitrate: 0,
          });
        }

        agoraEngine.startPreview();

        agoraEngine.joinChannel(token, channelName, serverUid || 0, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('[AGORA] Setup failed:', message);
        Alert.alert(t('common.error'), t('call.startFailed'));
      }
    };

    setupVideoSDK();

    return () => {
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
    };
  }, [channelName, token, serverUid, t, setIsJoined]);

  const controls = useMemo(
    () => ({
      toggleMute: (): boolean => {
        const current = engineRef.current;
        if (!current) return false;
        // 현재 mute 상태를 토글하기 위해 엔진의 현재 상태를 반전
        // 호출자가 상태를 추적해야 함
        return true;
      },
      toggleVideo: (): boolean => {
        return true;
      },
      muteAudio: (mute: boolean) => {
        engineRef.current?.muteLocalAudioStream(mute);
      },
      muteVideo: (mute: boolean) => {
        engineRef.current?.muteLocalVideoStream(mute);
      },
      switchCamera: () => {
        engineRef.current?.switchCamera();
      },
      takeSnapshot: (uid: number, filePath: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          if (!engineRef.current) {
            reject(new Error('Agora engine not initialized'));
            return;
          }

          snapshotResolverRef.current = { resolve, reject };

          // 5초 타임아웃
          const timeout = setTimeout(() => {
            if (snapshotResolverRef.current) {
              snapshotResolverRef.current = null;
              reject(new Error('Snapshot timeout'));
            }
          }, 5000);

          const result = engineRef.current.takeSnapshot(uid, filePath);

          if (result !== 0) {
            clearTimeout(timeout);
            snapshotResolverRef.current = null;
            reject(new Error(`takeSnapshot returned error code: ${result}`));
          }
        });
      },
    }),
    [],
  );

  return { localUid, remoteUidRef, isRemoteJoined, controls };
};
