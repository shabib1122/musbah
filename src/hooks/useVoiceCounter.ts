import { useCallback, useEffect, useRef, useState } from 'react';
import { VoiceMode } from '../types/dhikr';
import { countPhraseMatches } from '../utils/arabicSpeech';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

interface UseVoiceCounterOptions {
  mode: VoiceMode;
  keywords: string[];
  sensitivity: number; // 1..10 for cadence mode
  onDetect: (delta: number, matchedLabel?: string) => void;
  onModeFallback?: (newMode: VoiceMode, reason: string) => void;
}

export function useVoiceCounter({
  mode,
  keywords,
  sensitivity,
  onDetect,
  onModeFallback,
}: UseVoiceCounterOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeechDetected, setIsSpeechDetected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0..100
  const [lastTranscript, setLastTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const isSpeechSupported = getSpeechRecognitionCtor() !== null;

  // Refs to keep handlers fresh without restarting active audio streams
  const isListeningRef = useRef(false);
  const modeRef = useRef(mode);
  const keywordsRef = useRef(keywords);
  const sensitivityRef = useRef(sensitivity);
  const onDetectRef = useRef(onDetect);
  const onModeFallbackRef = useRef(onModeFallback);

  modeRef.current = mode;
  keywordsRef.current = keywords;
  sensitivityRef.current = sensitivity;
  onDetectRef.current = onDetect;
  onModeFallbackRef.current = onModeFallback;

  // Speech engine refs
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const countedByIndexRef = useRef<Map<number, number>>(new Map());
  const restartTimeoutRef = useRef<number | null>(null);

  // Cadence engine refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const cleanupEngines = useCallback(() => {
    if (restartTimeoutRef.current !== null) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onspeechstart = null;
        recognitionRef.current.onspeechend = null;
        recognitionRef.current.abort();
      } catch {
        // Ignore cleanup error
      }
      recognitionRef.current = null;
    }
    countedByIndexRef.current.clear();

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setAudioLevel(0);
    setIsSpeechDetected(false);
  }, []);

  const startSpeechEngine = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatusNote('تم التحويل إلى نمط نبض الصوت لعدم دعم المتصفح لتمييز الكلمات.');
      onModeFallbackRef.current?.('cadence', 'unsupported');
      return;
    }

    const recognition = new Ctor();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    countedByIndexRef.current.clear();

    recognition.onspeechstart = () => {
      setIsSpeechDetected(true);
      setAudioLevel(68);
    };

    recognition.onspeechend = () => {
      setIsSpeechDetected(false);
      setAudioLevel(10);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let latestHeard = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || result.length === 0) continue;
        const transcript = result[0].transcript.trim();
        if (!transcript) continue;
        latestHeard = transcript;

        const { count, lastMatched } = countPhraseMatches(
          transcript,
          keywordsRef.current
        );
        const alreadyCounted = countedByIndexRef.current.get(i) ?? 0;

        if (count > alreadyCounted) {
          const delta = count - alreadyCounted;
          countedByIndexRef.current.set(i, count);
          onDetectRef.current(delta, lastMatched ?? transcript);
          setAudioLevel(92);
          window.setTimeout(() => {
            if (isListeningRef.current) setAudioLevel(24);
          }, 180);
        }
      }

      if (latestHeard) {
        setLastTranscript(latestHeard);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setErrorMessage('تعذر الوصول إلى الميكروفون. يرجى منح الإذن من إعدادات المتصفح.');
        isListeningRef.current = false;
        setIsListening(false);
        cleanupEngines();
        return;
      }
      if (event.error === 'network') {
        setStatusNote('تعذر الاتصال بخدمة تمييز الكلمات، تم التحويل إلى نمط نبض الصوت.');
        cleanupEngines();
        onModeFallbackRef.current?.('cadence', 'network');
        return;
      }
      setErrorMessage('حدث خلل في الاستماع الصوتي. يمكنك المحاولة مجدداً أو استخدام نبض الصوت.');
    };

    recognition.onend = () => {
      setIsSpeechDetected(false);
      setAudioLevel(0);
      if (isListeningRef.current && modeRef.current === 'speech') {
        restartTimeoutRef.current = window.setTimeout(() => {
          if (isListeningRef.current && modeRef.current === 'speech') {
            startSpeechEngine();
          }
        }, 160);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setErrorMessage(null);
    } catch {
      setErrorMessage('تعذر بدء التعرف الصوتي، جرب نمط نبض الصوت.');
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [cleanupEngines]);

  const startCadenceEngine = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('المتصفح لا يدعم الوصول إلى الميكروفون.');
      isListeningRef.current = false;
      setIsListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!isListeningRef.current || modeRef.current !== 'cadence') {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      mediaStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.35;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.fftSize);

      let speechStartTime: number | null = null;
      let silenceStartTime: number | null = null;
      let hasQualifiedUtterance = false;
      let cooldownUntil = 0;
      let lastUiUpdate = 0;

      const tick = () => {
        if (!isListeningRef.current || modeRef.current !== 'cadence') return;

        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const centered = (dataArray[i] - 128) / 128;
          sumSquares += centered * centered;
        }
        const rms = Math.min(100, Math.sqrt(sumSquares / dataArray.length) * 260);

        const now = performance.now();
        if (now - lastUiUpdate > 45) {
          setAudioLevel(Math.round(rms));
          lastUiUpdate = now;
        }

        // Sensitivity 1..10 -> onset threshold from ~17 down to ~4.5
        const onsetThreshold = Math.max(4, 18.5 - sensitivityRef.current * 1.4);
        const offsetThreshold = onsetThreshold * 0.6;

        if (now >= cooldownUntil) {
          if (rms >= onsetThreshold) {
            if (speechStartTime === null) {
              speechStartTime = now;
            }
            silenceStartTime = null;
            if (!hasQualifiedUtterance && now - speechStartTime >= 115) {
              hasQualifiedUtterance = true;
              setIsSpeechDetected(true);
            }
          } else if (rms < offsetThreshold) {
            if (hasQualifiedUtterance) {
              if (silenceStartTime === null) {
                silenceStartTime = now;
              } else if (now - silenceStartTime >= 240) {
                onDetectRef.current(1, 'نبض صوتي');
                setLastTranscript('تم رصد تسبيحة صوتية');
                hasQualifiedUtterance = false;
                speechStartTime = null;
                silenceStartTime = null;
                setIsSpeechDetected(false);
                cooldownUntil = now + 150;
              }
            } else if (speechStartTime !== null && now - speechStartTime < 115) {
              // Ignore ultra-short clicks or taps
              speechStartTime = null;
            }
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      setErrorMessage(null);
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setErrorMessage('تعذر الوصول إلى الميكروفون. تأكد من منح الإذن في المتصفح.');
      isListeningRef.current = false;
      setIsListening(false);
      cleanupEngines();
    }
  }, [cleanupEngines]);

  const startListening = useCallback(() => {
    setErrorMessage(null);
    setStatusNote(null);
    isListeningRef.current = true;
    setIsListening(true);
    cleanupEngines();

    if (modeRef.current === 'speech') {
      startSpeechEngine();
    } else {
      startCadenceEngine();
    }
  }, [cleanupEngines, startCadenceEngine, startSpeechEngine]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    cleanupEngines();
  }, [cleanupEngines]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // If user switches voiceMode while listening, smoothly restart with new engine
  useEffect(() => {
    if (!isListeningRef.current) return;
    cleanupEngines();
    if (mode === 'speech') {
      startSpeechEngine();
    } else {
      startCadenceEngine();
    }
  }, [mode, cleanupEngines, startCadenceEngine, startSpeechEngine]);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      cleanupEngines();
    };
  }, [cleanupEngines]);

  return {
    isListening,
    isSpeechDetected,
    audioLevel,
    lastTranscript,
    errorMessage,
    statusNote,
    isSpeechSupported,
    startListening,
    stopListening,
    toggleListening,
    clearMessages: () => {
      setErrorMessage(null);
      setStatusNote(null);
    },
  };
}
