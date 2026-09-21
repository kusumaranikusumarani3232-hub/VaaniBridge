import { useState } from "react";
import { useVoiceAgent, STATUS } from "../hooks/useVoiceAgent";
import { useDemoAgent } from "../hooks/useDemoAgent";
import { StatusIndicator } from "./StatusIndicator";
import { AudioVisualizer } from "./AudioVisualizer";
import { Transcript } from "./Transcript";
import { LanguageSelector, DEFAULT_LANGUAGE } from "./LanguageSelector";

/**
 * VoiceBridge — Main UI panel.
 * Handles both DEMO mode and REAL voice agent mode.
 */
export function VoiceBridge({ isDemo }) {
  const [selectedLang, setSelectedLang] = useState(DEFAULT_LANGUAGE);

  // Real voice agent
  const {
    status: realStatus,
    transcript: realTranscript,
    error: realError,
    isMicActive,
    startConversation,
    stopConversation,
    clearTranscript: clearReal,
  } = useVoiceAgent();

  // Demo agent
  const {
    status: demoStatus,
    transcript: demoTranscript,
    startDemo,
    stopDemo,
    clearTranscript: clearDemo,
  } = useDemoAgent();

  const status = isDemo ? demoStatus : realStatus;
  const transcript = isDemo ? demoTranscript : realTranscript;
  const error = isDemo ? null : realError;

  const isActive = status !== STATUS.IDLE && status !== "ERROR";
  const isConnecting = status === STATUS.CONNECTING;

  const handleStart = () => {
    if (isDemo) {
      startDemo();
    } else {
      startConversation(selectedLang.code, selectedLang.voice);
    }
  };

  const handleStop = () => {
    if (isDemo) {
      stopDemo();
    } else {
      stopConversation();
    }
  };

  const handleClear = () => {
    if (isDemo) clearDemo();
    else clearReal();
  };

  const handleLanguageChange = (lang) => {
    setSelectedLang(lang);
  };

  return (
    <div className="voice-bridge-panel">
      {/* Language selector */}
      <div className="panel-section">
        <LanguageSelector
          selected={selectedLang.code}
          onChange={handleLanguageChange}
          disabled={isActive}
        />
      </div>

      {/* Status */}
      <div className="panel-section status-section">
        <StatusIndicator status={status} />
        <AudioVisualizer isMicActive={isMicActive} status={status} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner" role="alert" id="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* Controls */}
      <div className="controls-row">
        {!isActive ? (
          <button
            id="btn-start"
            className="btn btn-start"
            onClick={handleStart}
            disabled={isConnecting}
          >
            <span className="btn-icon">🎙</span>
            Start Conversation
          </button>
        ) : (
          <button
            id="btn-stop"
            className="btn btn-stop"
            onClick={handleStop}
          >
            <span className="btn-icon">⏹</span>
            End Conversation
          </button>
        )}

        <button
          id="btn-clear"
          className="btn btn-secondary"
          onClick={handleClear}
          disabled={transcript.length === 0}
          title="Clear conversation transcript"
        >
          Clear
        </button>
      </div>

      {/* Mic hint */}
      {status === STATUS.IDLE && !isDemo && (
        <p className="mic-hint">
          🔒 Your microphone is <strong>off</strong> until you start
        </p>
      )}

      {/* Transcript */}
      <div className="transcript-container" id="transcript-container">
        <div className="transcript-header">
          <span className="transcript-title">Conversation</span>
          <span className="transcript-count">
            {transcript.length} message{transcript.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Transcript transcript={transcript} status={status} />
      </div>
    </div>
  );
}
