import { useEffect, useRef } from 'react';
import { useCallStore } from '../../store/callStore';

interface UseCallTimerParams {
  maxDuration: number;
  onTimeUp: () => void;
  enabled: boolean;
}

export const useCallTimer = ({
  maxDuration,
  onTimeUp,
  enabled,
}: UseCallTimerParams) => {
  const setCallDuration = useCallStore(state => state.setCallDuration);
  const callDuration = useCallStore(state => state.callDuration);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (!enabled) return;
    setCallDuration(0);

    const interval = setInterval(() => {
      const current = useCallStore.getState().callDuration;
      if (current >= maxDuration) {
        clearInterval(interval);
        onTimeUpRef.current();
        return;
      }
      setCallDuration(current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, maxDuration, setCallDuration]);

  return { callDuration };
};
