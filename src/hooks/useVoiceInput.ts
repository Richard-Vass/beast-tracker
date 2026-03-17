'use client';

import { useState, useCallback, useRef } from 'react';

interface VoiceResult {
  weight?: number;
  reps?: number;
  rir?: string;
}

export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const parseTranscript = (text: string): VoiceResult => {
    const result: VoiceResult = {};
    const lower = text.toLowerCase().replace(/,/g, '.');

    // Parse weight: "80 kilo" or just numbers before "kg"
    const weightMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:kilo|kg|kilogramov)/);
    if (weightMatch) result.weight = parseFloat(weightMatch[1]);

    // Parse reps: "10 opakovania" or "10 reps"
    const repsMatch = lower.match(/(\d+)\s*(?:opakov|reps|rep|krát)/);
    if (repsMatch) result.reps = parseInt(repsMatch[1]);

    // Parse RIR: "rir 2" or "2 v zálohe"
    const rirMatch = lower.match(/(?:rir|v zálohe|záloha)\s*(\d+)/);
    if (rirMatch) result.rir = rirMatch[1];

    // If just numbers: first = weight, second = reps
    if (!result.weight && !result.reps) {
      const nums = lower.match(/\d+(?:\.\d+)?/g);
      if (nums && nums.length >= 2) {
        result.weight = parseFloat(nums[0]);
        result.reps = parseInt(nums[1]);
      } else if (nums && nums.length === 1) {
        result.reps = parseInt(nums[0]);
      }
    }

    return result;
  };

  const startListening = useCallback((onResult: (result: VoiceResult) => void) => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = 'sk-SK';
    recognition.continuous = false;
    recognition.interimResults = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      const parsed = parseTranscript(text);
      onResult(parsed);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const isSupported = typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return { isListening, transcript, startListening, stopListening, isSupported };
}
