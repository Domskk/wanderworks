import { useState, useCallback, useRef, useEffect } from 'react';

// ──────────────────────────────────────────────────────────────
// SAME TYPES — UNCHANGED
// ──────────────────────────────────────────────────────────────
interface SpeechRecognitionErrorEvent extends Event {
  error: SpeechRecognitionErrorCode;
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
type SpeechRecognitionErrorCode =
  | 'no-speech' | 'aborted' | 'audio-capture' | 'network'
  | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported';

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ──────────────────────────────────────────────────────────────
// SAME LANGUAGE MAP — UNCHANGED
// ──────────────────────────────────────────────────────────────
const VOICE_LANG_MAP: Record<string, string> = {
  en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', es: 'es-ES',
  fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-BR', ru: 'ru-RU',
  ar: 'ar-SA', hi: 'hi-IN', th: 'th-TH', vi: 'vi-VN', id: 'id-ID',
  tl: 'fil-PH', ms: 'ms-MY',
};

const getVoiceLang = (code: string): string => {
  const normalized = code.toLowerCase().trim();
  return VOICE_LANG_MAP[normalized] || 'en-US';
};

// ──────────────────────────────────────────────────────────────
// FIXED useVoice HOOK (keeps original API)
// ──────────────────────────────────────────────────────────────
export function useVoice(onTranscript?: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recRef = useRef<SpeechRecognition | null>(null);
  const sentRef = useRef(false); // prevents double send

  // Stop everything on unmount
  useEffect(() => {
    return () => {
      try { recRef.current?.stop(); } catch {}
      window.speechSynthesis.cancel();
    };
  }, []);

  // ──────────────────────────────────────────────────────────────
  // FIX 1: stable and safe startListening
  // ──────────────────────────────────────────────────────────────
  const startListening = useCallback((lang = 'en-US') => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn("SpeechRecognition not supported");
      return;
    }

    // Reset protection for duplicate send
    sentRef.current = false;
    setTranscript("");

    // Stop previous safely (stop > abort)
    if (recRef.current) {
      try { recRef.current.stop(); } catch {}
    }

    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.continuous = false;

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0];
      if (!result?.[0]) return;

      const text = result[0].transcript.trim();

      // Prevent duplicate sends
      if (sentRef.current) return;
      sentRef.current = true;

      setTranscript(text);
      onTranscript?.(text);

      try { rec.stop(); } catch {}
    };

    rec.onerror = () => {
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recRef.current = rec;
    rec.start();
  }, [onTranscript]);

  // ──────────────────────────────────────────────────────────────
  // Helper: Pick best voice for language
  // ──────────────────────────────────────────────────────────────
  const pickVoice = (lang: string) => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.lang.toLowerCase().startsWith(lang.toLowerCase())) 
        || voices.find(v => v.lang.startsWith("en"))
        || voices[0];
  };

  // ──────────────────────────────────────────────────────────────
  // FIXED speakReply (English)
  // ──────────────────────────────────────────────────────────────
  const speakReply = useCallback((text: string) => {
    if (!text.trim()) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.voice = pickVoice("en-US");
    utter.rate = 0.95;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, []);

  // ──────────────────────────────────────────────────────────────
  // FIXED speakLocal (any language)
  // ──────────────────────────────────────────────────────────────
  const speakLocal = useCallback((text: string, langCode: string) => {
    if (!text.trim()) return;

    const lang = getVoiceLang(langCode);
    const utter = new SpeechSynthesisUtterance(text);

    utter.lang = lang;
    utter.voice = pickVoice(lang);
    utter.rate = 0.90;
    utter.pitch = 1;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, []);

  // ──────────────────────────────────────────────────────────────
  // SAME reset — unchanged
  // ──────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setTranscript("");
    sentRef.current = false;
  }, []);

  return {
    transcript,
    isListening,
    isSpeaking,
    startListening,
    speakReply,
    speakLocal,
    reset,
  };
}
