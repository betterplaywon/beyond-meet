import { useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../@types';
import * as socketService from '../../services/socketService';

type EndCallReason =
  | 'user'
  | 'timeUp'
  | 'moderation'
  | 'remote'
  | 'moderationForceEnd';

interface EndCallOptions {
  reason: EndCallReason;
  alertTitle?: string;
  alertMessage?: string;
  emitSocket?: boolean;
}

interface UseCallEndParams {
  sessionId: string;
  navigation: StackNavigationProp<RootStackParamList, 'VideoCall'>;
}

export const useCallEnd = ({ sessionId, navigation }: UseCallEndParams) => {
  const { t } = useTranslation();
  const isCallEndedRef = useRef(false);
  const cleanupCallbacks = useRef<(() => void)[]>([]);

  const registerCleanup = useCallback((cleanup: () => void) => {
    cleanupCallbacks.current.push(cleanup);
  }, []);

  const endCall = useCallback(
    ({ reason, alertTitle, alertMessage, emitSocket }: EndCallOptions) => {
      if (isCallEndedRef.current) return;
      isCallEndedRef.current = true;

      // 등록된 모든 cleanup 실행
      cleanupCallbacks.current.forEach(cb => cb());

      if (emitSocket) {
        socketService.endCall(sessionId);
      }

      if (reason === 'timeUp') {
        Alert.alert(t('call.timeUp'), t('call.timeUpMessage'));
        navigation.replace('CallEnd', { sessionId });
        return;
      }

      const title = alertTitle || t('call.ended');
      const message = alertMessage || '';

      Alert.alert(title, message, [
        {
          text: t('common.confirm'),
          onPress: () => {
            navigation.replace('CallEnd', { sessionId });
          },
        },
      ]);
    },
    [sessionId, navigation, t],
  );

  return { isCallEndedRef, endCall, registerCleanup };
};
