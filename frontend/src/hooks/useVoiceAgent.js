/**
 * useVoiceAgent — Core hook for the AssemblyAI Voice Agent WebSocket session.
 *
 * Handles:
 * - Fetching a temporary token from the backend
 * - WebSocket connection to wss://agents.assemblyai.com/v1/ws?token=...
 * - Microphone capture via getUserMedia + AudioWorklet (24kHz PCM16)
 * - Sending input.audio messages (base64 PCM16)
 * - Receiving and playing back reply.audio (base64 PCM16)
 * - Transcript accumulation from transcript.user / transcript.agent events
 * - Status machine: IDLE → CONNECTING → CONNECTED → LISTENING → THINKING → SPEAKING
 * - Clean session termination (session.end + microphone stop)
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const BACKEND_URL = "http://localhost:8000";
const SAMPLE_RATE = 24000; // AssemblyAI Voice Agent requires 24 kHz
const PCM_WORKLET_URL = "/worklets/pcm-processor.js";

// Status values
export const STATUS = {
  IDLE: "IDLE",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  LISTENING: "LISTENING",
  THINKING: "THINKING",
  SPEAKING: "SPEAKING",
  ERROR: "ERROR",
};

// ─── Utility: Float32 → PCM16 conversion ─────────────────────────────────────

function float32ToPCM16(float32Array) {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return pcm16;
}

function pcm16ToBase64(int16Array) {
  const bytes = new Uint8Array(int16Array.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── Utility: Base64 PCM16 → playback via AudioContext ───────────────────────

function base64ToPCM16(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  // Convert bytes to Int16Array then Float32
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useVoiceAgent() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [isMicActive, setIsMicActive] = useState(false);

  // Refs (survive re-renders without triggering them)
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const workletNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const playbackQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const activeSourceRef = useRef(null);
  const isSessionReadyRef = useRef(false);
  const agentTextBufferRef = useRef("");
  const userTextBufferRef = useRef("");

  // ─── Audio Playback Queue ───────────────────────────────────────────────────

  const enqueueAudio = useCallback((float32Samples) => {
    playbackQueueRef.current.push(float32Samples);
    if (!isPlayingRef.current) {
      playNextChunk();
    }
  }, []);

  const playNextChunk = useCallback(() => {
    const queue = playbackQueueRef.current;
    if (queue.length === 0) {
      isPlayingRef.current = false;
      activeSourceRef.current = null;
      return;
    }

    const ctx = audioCtxRef.current;
    if (!ctx) return;

    isPlayingRef.current = true;
    const samples = queue.shift();
    const buffer = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    activeSourceRef.current = source;
    source.onended = () => {
      activeSourceRef.current = null;
      playNextChunk();
    };
    source.start();
  }, []);

  const clearPlaybackQueue = useCallback(() => {
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch {
        // Source may already have stopped
      }
      activeSourceRef.current = null;
    }
  }, []);

  // ─── Transcript helpers ─────────────────────────────────────────────────────

  const addTranscriptEntry = useCallback((role, text) => {
    setTranscript((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), role, text, timestamp: new Date() },
    ]);
  }, []);

  // ─── WebSocket event handler ────────────────────────────────────────────────

  const handleWSMessage = useCallback(
    (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      const type = data.type;

      switch (type) {
        case "session.ready":
          isSessionReadyRef.current = true;
          setStatus(STATUS.LISTENING);
          break;

        case "transcript.user.delta":
          // Partial user transcript — update buffer
          userTextBufferRef.current = data.text || "";
          break;

        case "transcript.user":
          // Final user transcript
          if (data.text && data.text.trim()) {
            addTranscriptEntry("user", data.text.trim());
          }
          userTextBufferRef.current = "";
          setStatus(STATUS.THINKING);
          break;

        case "transcript.agent.delta":
          agentTextBufferRef.current = data.text || "";
          setStatus(STATUS.SPEAKING);
          break;

        case "transcript.agent":
          // Final agent transcript
          if (data.text && data.text.trim()) {
            addTranscriptEntry("agent", data.text.trim());
          }
          agentTextBufferRef.current = "";
          break;

        case "reply.audio":
          // Received agent audio chunk — decode and enqueue for playback
          const audioPayload = data.audio || data.data;
          if (audioPayload) {
            setStatus(STATUS.SPEAKING);
            const float32 = base64ToPCM16(audioPayload);
            enqueueAudio(float32);
          }
          break;

        case "reply.done":
          if (data.status === "interrupted") {
            clearPlaybackQueue();
          }
          setStatus(STATUS.LISTENING);
          break;

        case "session.ended":
          isSessionReadyRef.current = false;
          setStatus(STATUS.IDLE);
          break;

        default:
          // Ignore unknown events
          break;
      }
    },
    [addTranscriptEntry, enqueueAudio, clearPlaybackQueue]
  );

  // ─── Start conversation ─────────────────────────────────────────────────────

  const startConversation = useCallback(async (language = "en", voice = "ivy") => {
    if (wsRef.current) return; // Already running

    setError(null);
    setStatus(STATUS.CONNECTING);
    setTranscript([]);
    isSessionReadyRef.current = false;

    try {
      // 1. Fetch temporary token from backend
      const tokenRes = await fetch(`${BACKEND_URL}/api/token`, {
        method: "POST",
      });

      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}));
        throw new Error(errData.detail || `Token request failed (${tokenRes.status})`);
      }

      const { token, ws_url } = await tokenRes.json();

      // 2. Set up AudioContext (must be after user gesture)
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }

      // 3. Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      micStreamRef.current = stream;
      setIsMicActive(true);

      // 4. Load AudioWorklet and connect microphone
      await audioCtxRef.current.audioWorklet.addModule(PCM_WORKLET_URL);
      workletNodeRef.current = new AudioWorkletNode(
        audioCtxRef.current,
        "pcm-processor"
      );

      // The worklet sends Float32 chunks; we convert to PCM16 and base64
      // MUST wait for session.ready before sending input.audio to AssemblyAI Voice Agent
      workletNodeRef.current.port.onmessage = (e) => {
        if (
          wsRef.current &&
          wsRef.current.readyState === WebSocket.OPEN &&
          isSessionReadyRef.current
        ) {
          const pcm16 = float32ToPCM16(e.data.pcmFloat32);
          const b64 = pcm16ToBase64(pcm16);
          wsRef.current.send(
            JSON.stringify({ type: "input.audio", audio: b64 })
          );
        }
      };

      sourceNodeRef.current = audioCtxRef.current.createMediaStreamSource(stream);
      sourceNodeRef.current.connect(workletNodeRef.current);
      // Don't connect worklet to destination (we don't want mic echo)

      // 5. Open WebSocket to AssemblyAI Voice Agent
      const wsUrl = `${ws_url}?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus(STATUS.CONNECTED);

        // 6. Send session.update to configure agent
        const systemPrompt =
          language === "hi"
            ? `You are VaaniBridge, a friendly multilingual AI voice assistant. The user may speak in Hindi or English. Respond naturally and conversationally in whichever language the user uses. Keep responses concise and helpful. When responding in Hindi, use natural conversational Hindi.`
            : `You are VaaniBridge, a friendly multilingual AI voice assistant. Understand the user's spoken language and respond naturally and conversationally. Keep responses concise and useful.`;

        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              system_prompt: systemPrompt,
              greeting:
                language === "hi"
                  ? "नमस्ते! मैं VaaniBridge हूँ। आप मुझसे English या Hindi में बात कर सकते हैं। मैं आपकी कैसे मदद कर सकता हूँ?"
                  : "Hello! I'm VaaniBridge, your multilingual AI voice assistant. You can speak to me in English or Hindi. How can I help you today?",
              output: {
                voice: voice,
              },
              input: {
                turn_detection: {
                  vad_threshold: 0.5,
                  min_silence: 500,
                  max_silence: 1200,
                  interrupt_response: true,
                },
              },
            },
          })
        );
      };

      ws.onmessage = handleWSMessage;

      ws.onerror = () => {
        setError("WebSocket connection error. Check your network and API key.");
        setStatus(STATUS.ERROR);
        stopConversation();
      };

      ws.onclose = (event) => {
        if (event.code !== 1000) {
          // Abnormal close
          if (status !== STATUS.IDLE) {
            setError(`Connection closed unexpectedly (code ${event.code})`);
            setStatus(STATUS.ERROR);
          }
        }
        cleanupRefs();
      };
    } catch (err) {
      const msg = err.message || "Failed to start voice agent";
      setError(
        err.name === "NotAllowedError"
          ? "Microphone permission denied. Please allow microphone access in your browser."
          : err.name === "NotFoundError"
          ? "No microphone found. Please connect a microphone."
          : msg
      );
      setStatus(STATUS.ERROR);
      cleanupRefs();
    }
  }, [handleWSMessage]);

  // ─── Stop conversation ──────────────────────────────────────────────────────

  const cleanupRefs = useCallback(() => {
    // Stop microphone
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    // Disconnect worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    // Clear audio queue
    clearPlaybackQueue();
    isSessionReadyRef.current = false;
    setIsMicActive(false);
    wsRef.current = null;
  }, [clearPlaybackQueue]);

  const stopConversation = useCallback(() => {
    // Send clean session.end
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "session.end" }));
      wsRef.current.close(1000, "User ended session");
    }
    cleanupRefs();
    setStatus(STATUS.IDLE);
  }, [cleanupRefs]);

  // ─── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, []);

  return {
    status,
    transcript,
    error,
    isMicActive,
    startConversation,
    stopConversation,
    clearTranscript: () => setTranscript([]),
  };
}
