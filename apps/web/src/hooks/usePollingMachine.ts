import { useCallback, useEffect, useRef, useState } from 'react';

type PollingPhase = 'idle' | 'intensive' | 'soft';

type PollingConfig = {
  intensiveBaseMs: number;
  intensiveMaxMs: number;
  intensiveDurationMs: number;
  softBaseMs: number;
  softMaxMs: number;
  maxAttempts: number;
};

type PollingCallbacks = {
  onStatusCheck: (source: string) => Promise<void>;
  onMaxAttemptsReached: () => void;
  onIntensivePhaseEnd: () => void;
};

export function usePollingMachine(config: PollingConfig, callbacks: PollingCallbacks) {
  const [isPolling, setIsPolling] = useState(false);
  const pollTimeoutRef = useRef<number | null>(null);
  const pollPhaseTimeoutRef = useRef<number | null>(null);
  const pollAttemptRef = useRef(0);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const stopTimers = useCallback(() => {
    if (pollTimeoutRef.current !== null) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (pollPhaseTimeoutRef.current !== null) {
      window.clearTimeout(pollPhaseTimeoutRef.current);
      pollPhaseTimeoutRef.current = null;
    }
    pollAttemptRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    stopTimers();
    setIsPolling(false);
  }, [stopTimers]);

  const schedulePollWithBackoff = useCallback((baseMs: number, maxMs: number) => {
    if (pollAttemptRef.current >= config.maxAttempts) {
      setIsPolling(false);
      callbacksRef.current.onMaxAttemptsReached();
      return;
    }
    const delay = Math.min(maxMs, baseMs * Math.pow(1.5, pollAttemptRef.current));
    pollAttemptRef.current += 1;
    pollTimeoutRef.current = window.setTimeout(() => {
      pollTimeoutRef.current = null;
      void callbacksRef.current.onStatusCheck('polling');
      schedulePollWithBackoff(baseMs, maxMs);
    }, delay);
  }, [config.maxAttempts]);

  const startSoft = useCallback((remainingMs: number) => {
    stopTimers();

    if (remainingMs <= 0) {
      stop();
      callbacksRef.current.onMaxAttemptsReached();
      return;
    }

    setIsPolling(true);
    schedulePollWithBackoff(config.softBaseMs, config.softMaxMs);

    pollPhaseTimeoutRef.current = window.setTimeout(() => {
      stop();
      callbacksRef.current.onMaxAttemptsReached();
    }, remainingMs);
  }, [config.softBaseMs, config.softMaxMs, schedulePollWithBackoff, stop, stopTimers]);

  const startSoftRef = useRef(startSoft);
  startSoftRef.current = startSoft;

  const startIntensive = useCallback((remainingMs: number) => {
    stopTimers();

    if (remainingMs <= 0) {
      callbacksRef.current.onIntensivePhaseEnd();
      return;
    }

    setIsPolling(true);
    schedulePollWithBackoff(config.intensiveBaseMs, config.intensiveMaxMs);

    pollPhaseTimeoutRef.current = window.setTimeout(() => {
      stopTimers();
      callbacksRef.current.onIntensivePhaseEnd();
    }, remainingMs);
  }, [config.intensiveBaseMs, config.intensiveMaxMs, schedulePollWithBackoff, stopTimers]);

  useEffect(() => {
    return () => {
      stopTimers();
    };
  }, [stopTimers]);

  return {
    isPolling,
    stop,
    stopTimers,
    startIntensive,
    startSoft,
  };
}
