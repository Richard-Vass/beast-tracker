'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export function useRestTimer() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create beep audio
    if (typeof window !== 'undefined') {
      try {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0;
        oscillator.start();
        audioRef.current = null; // we'll use AudioContext directly
      } catch { /* ignore */ }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => { gain.gain.value = 0; osc.stop(); ctx.close(); }, 200);
    } catch { /* ignore */ }
  }, []);

  const start = useCallback((seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTotalTime(seconds);
    setTimeLeft(seconds);
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsRunning(false);
          playBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [playBeep]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setTimeLeft(0);
  }, []);

  const addTime = useCallback((seconds: number) => {
    setTimeLeft(prev => prev + seconds);
    setTotalTime(prev => prev + seconds);
  }, []);

  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;

  return { timeLeft, isRunning, totalTime, progress, start, stop, addTime };
}
