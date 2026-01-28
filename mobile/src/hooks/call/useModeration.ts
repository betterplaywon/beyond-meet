import { useEffect, useRef, useCallback } from 'react';
import RNFS from 'react-native-fs';
import ViewShot from 'react-native-view-shot';
import * as socketService from '../../services/socketService';
import api from '../../services/api';

interface UseModerationParams {
  sessionId: string;
  partnerId: string;
  isCallEndedRef: React.MutableRefObject<boolean>;
  remoteVideoRef: React.RefObject<ViewShot | null>;
  isRemoteJoined: boolean;
  isJoined: boolean;
  onCallForceEnd: () => void;
}

export const useModeration = ({
  sessionId,
  partnerId,
  isCallEndedRef,
  remoteVideoRef,
  isRemoteJoined,
  isJoined,
  onCallForceEnd,
}: UseModerationParams) => {
  const moderationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunningRef = useRef(false);
  const isAnalyzingRef = useRef(false);

  const sessionIdRef = useRef(sessionId);
  const partnerIdRef = useRef(partnerId);
  const onCallForceEndRef = useRef(onCallForceEnd);

  sessionIdRef.current = sessionId;
  partnerIdRef.current = partnerId;
  onCallForceEndRef.current = onCallForceEnd;

  const cleanup = useCallback(() => {
    if (initialTimeoutRef.current) {
      clearTimeout(initialTimeoutRef.current);
      initialTimeoutRef.current = null;
    }
    if (moderationIntervalRef.current) {
      clearInterval(moderationIntervalRef.current);
      moderationIntervalRef.current = null;
    }
    isRunningRef.current = false;
    isAnalyzingRef.current = false;
  }, []);

  const captureAndAnalyzeFrame = useCallback(async () => {
    if (isCallEndedRef.current) return;
    if (!remoteVideoRef.current) return;
    if (isAnalyzingRef.current) return;

    isAnalyzingRef.current = true;

    try {
      const uri = await remoteVideoRef.current.capture?.();

      if (!uri) return;

      if (isCallEndedRef.current) {
        await RNFS.unlink(uri).catch(() => {});
        return;
      }

      const base64 = await RNFS.readFile(uri, 'base64');
      const imageBase64 = `data:image/jpeg;base64,${base64}`;

      await RNFS.unlink(uri).catch(() => {});

      if (isCallEndedRef.current) return;

      const response = await api.post(
        '/moderation/analyze',
        {
          sessionId: sessionIdRef.current,
          imageBase64,
        },
        {
          timeout: 30000,
        },
      );

      if (isCallEndedRef.current) return;

      const { action } = response.data.data;

      if (action === 'WARNING_ISSUED') {
        socketService.sendModerationWarning(
          sessionIdRef.current,
          partnerIdRef.current,
        );
      } else if (action === 'CALL_ENDED') {
        socketService.sendModerationForceEnd(sessionIdRef.current);
        onCallForceEndRef.current();
      }
    } catch {
      // 에러 발생 시 무시 (다음 분석 주기에 재시도)
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [isCallEndedRef, remoteVideoRef]);

  useEffect(() => {
    if (!isJoined || !isRemoteJoined) {
      cleanup();
      return;
    }

    if (isRunningRef.current) return;

    isRunningRef.current = true;

    initialTimeoutRef.current = setTimeout(() => {
      captureAndAnalyzeFrame();
    }, 3000);

    moderationIntervalRef.current = setInterval(() => captureAndAnalyzeFrame(), 5000);

    return cleanup;
  }, [isJoined, isRemoteJoined, captureAndAnalyzeFrame, cleanup]);

  return { cleanup };
};
