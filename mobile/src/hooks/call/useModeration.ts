import { useEffect, useRef, useCallback } from 'react';
import RNFS from 'react-native-fs';
import * as socketService from '../../services/socketService';
import api from '../../services/api';

interface UseModerationParams {
  sessionId: string;
  partnerId: string;
  isCallEndedRef: React.MutableRefObject<boolean>;
  takeSnapshot: (uid: number, filePath: string) => Promise<string>;
  remoteUidRef: React.MutableRefObject<number>;
  isRemoteJoined: boolean;
  isJoined: boolean;
  onCallForceEnd: () => void;
}

export const useModeration = ({
  sessionId,
  partnerId,
  isCallEndedRef,
  takeSnapshot,
  remoteUidRef,
  isRemoteJoined,
  isJoined,
  onCallForceEnd,
}: UseModerationParams) => {
  const moderationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const cleanup = useCallback(() => {
    if (moderationIntervalRef.current) {
      clearInterval(moderationIntervalRef.current);
      moderationIntervalRef.current = null;
    }
  }, []);

  const captureAndAnalyzeFrame = useCallback(async () => {
    if (isCallEndedRef.current) return;
    if (remoteUidRef.current === 0) return;

    try {
      const timestamp = Date.now();
      const filePath = `${RNFS.CachesDirectoryPath}/moderation_snapshot_${timestamp}.jpg`;

      const capturedFilePath = await takeSnapshot(
        remoteUidRef.current,
        filePath,
      );

      if (isCallEndedRef.current) {
        await RNFS.unlink(capturedFilePath).catch(() => {});
        return;
      }

      const base64 = await RNFS.readFile(capturedFilePath, 'base64');
      const imageBase64 = `data:image/jpeg;base64,${base64}`;

      await RNFS.unlink(capturedFilePath).catch(() => {});

      if (isCallEndedRef.current) return;

      const response = await api.post('/moderation/analyze', {
        sessionId,
        imageBase64,
      });

      if (isCallEndedRef.current) return;

      const { action } = response.data.data;

      if (action === 'WARNING_ISSUED') {
        socketService.sendModerationWarning(
          sessionId,
          partnerId,
        );
      } else if (action === 'CALL_ENDED') {
        socketService.sendModerationForceEnd(sessionId);
        onCallForceEnd();
      }
    } catch (error: unknown) {
      if (__DEV__) {
        const message =
          error instanceof Error ? error.message : 'Unknown moderation error';
        console.warn('[MODERATION] Frame analysis failed (will retry):', message);
      }
    }
  }, [sessionId, partnerId, isCallEndedRef, remoteUidRef, takeSnapshot, onCallForceEnd]);

  useEffect(() => {
    if (!isJoined || !isRemoteJoined) {
      cleanup();
      return;
    }

    const interval = setInterval(captureAndAnalyzeFrame, 4000);
    moderationIntervalRef.current = interval;

    return cleanup;
  }, [isJoined, isRemoteJoined, captureAndAnalyzeFrame, cleanup]);

  return { cleanup };
};
