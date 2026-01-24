import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocketEvent } from '../useSocket';
import type { useCallEnd } from './useCallEnd';

type EndCallFn = ReturnType<typeof useCallEnd>['endCall'];

interface UseCallSocketEventsParams {
  endCall: EndCallFn;
  moderationCleanup: () => void;
}

export const useCallSocketEvents = ({
  endCall,
  moderationCleanup,
}: UseCallSocketEventsParams) => {
  const { t } = useTranslation();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  useSocketEvent('call:ended', () => {
    moderationCleanup();
    endCall({
      reason: 'remote',
      alertTitle: t('call.ended'),
      alertMessage: t('call.endedByOther'),
    });
  });

  useSocketEvent('moderation:warning-received', (data: { message?: string }) => {
    setWarningMessage(data.message || t('moderation.warningMessage'));
    setShowWarningModal(true);
  });

  useSocketEvent('moderation:call-force-ended', () => {
    moderationCleanup();
    endCall({
      reason: 'moderationForceEnd',
      alertTitle: t('call.ended'),
      alertMessage: t('call.endedByModeration'),
    });
  });

  const dismissWarning = useCallback(() => setShowWarningModal(false), []);

  return { showWarningModal, warningMessage, dismissWarning };
};
