import { useCallback, useRef, useState } from "react";
import { DEMO_CONVERSATION } from "../demo/demoConversation";

export const DEMO_STATUS = {
  IDLE: "IDLE",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  LISTENING: "LISTENING",
  THINKING: "THINKING",
  SPEAKING: "SPEAKING",
};

/**
 * useDemoAgent — Simulates the Voice Agent session for Demo Mode.
 * No network calls. No AssemblyAI credits. Purely client-side.
 */
export function useDemoAgent() {
  const [status, setStatus] = useState(DEMO_STATUS.IDLE);
  const [transcript, setTranscript] = useState([]);
  const timerRefs = useRef([]);

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  }, []);

  const startDemo = useCallback(() => {
    clearTimers();
    setTranscript([]);
    setStatus(DEMO_STATUS.CONNECTING);

    DEMO_CONVERSATION.forEach((item) => {
      const t = setTimeout(() => {
        if (item.role === "status") {
          setStatus(item.status);
        } else {
          if (item.status) setStatus(item.status);
          setTranscript((prev) => [
            ...prev,
            {
              id: item.id,
              role: item.role,
              text: item.text,
              timestamp: new Date(),
            },
          ]);
          // After speaking, go back to LISTENING
          if (item.status === "SPEAKING") {
            const listeningDelay = setTimeout(() => {
              setStatus(DEMO_STATUS.LISTENING);
            }, 4000);
            timerRefs.current.push(listeningDelay);
          }
        }
      }, item.delay);
      timerRefs.current.push(t);
    });

    // End demo after all conversation
    const endTimer = setTimeout(() => {
      setStatus(DEMO_STATUS.IDLE);
    }, 45000);
    timerRefs.current.push(endTimer);
  }, [clearTimers]);

  const stopDemo = useCallback(() => {
    clearTimers();
    setStatus(DEMO_STATUS.IDLE);
  }, [clearTimers]);

  return {
    status,
    transcript,
    startDemo,
    stopDemo,
    clearTranscript: () => setTranscript([]),
  };
}
