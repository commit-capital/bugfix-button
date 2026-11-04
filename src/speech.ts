import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Minimal Web Speech shape; DOM libs vary.
interface SpeechRec extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
type SpeechRecCtor = new () => SpeechRec;

function recognizer(): SpeechRecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechInput {
  active: boolean;
  error: string;
  supported: boolean;
  toggle: () => void;
  stop: () => void;
}

/** Dictation that appends recognized phrases. */
export function useSpeechInput(append: (text: string) => void, initialActive: boolean): SpeechInput {
  const Ctor = recognizer();
  const [active, setActive] = useState(initialActive && Ctor !== null);
  const [error, setError] = useState("");
  const current = useRef<SpeechRec | null>(null);
  const appendRef = useRef(append);
  useLayoutEffect(() => { appendRef.current = append; });

  useEffect(() => {
    if (!Ctor || !active) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = false;
    r.lang = navigator.language || "en-US";
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .slice(e.resultIndex)
        .map((res) => res[0].transcript.trim())
        .filter(Boolean)
        .join(" ");
      if (text) appendRef.current(text);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") setError(e.error);
      setActive(false);
    };
    r.onend = () => {
      // Browsers end sessions on silence; resume.
      if (current.current === r) {
        try { r.start(); } catch { /* already started */ }
      }
    };
    r.start();
    current.current = r;
    return () => {
      current.current = null;
      try { r.stop(); } catch { /* already stopped */ }
    };
  }, [Ctor, active]);

  const toggle = useCallback(() => {
    setError("");
    setActive((on) => !on);
  }, []);

  const stop = useCallback(() => {
    const r = current.current;
    current.current = null;
    try { r?.stop(); } catch { /* already stopped */ }
    setActive(false);
  }, []);

  return { active, error, supported: Ctor !== null, toggle, stop };
}
