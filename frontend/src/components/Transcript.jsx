import { useEffect, useRef } from "react";

/**
 * Transcript — Scrolling conversation view.
 * Shows user messages and agent responses in chat bubbles.
 */
export function Transcript({ transcript, status }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, status]);

  if (transcript.length === 0) {
    return (
      <div className="transcript-empty" id="transcript-empty-state">
        <div className="transcript-empty-icon">💬</div>
        <p className="transcript-empty-text">
          Your conversation will appear here
        </p>
        <p className="transcript-empty-sub">
          Start speaking after clicking "Start Conversation"
        </p>
      </div>
    );
  }

  return (
    <div className="transcript-list" id="transcript-list" role="log" aria-live="polite" aria-label="Conversation transcript">
      {transcript.map((entry) => (
        <div
          key={entry.id}
          className={`transcript-entry ${entry.role}`}
          data-testid={`transcript-${entry.role}`}
        >
          <div className="transcript-avatar">
            {entry.role === "user" ? "🎤" : "🤖"}
          </div>
          <div className="transcript-bubble">
            <span className="transcript-role">
              {entry.role === "user" ? "You" : "VaaniBridge"}
            </span>
            <p className="transcript-text">{entry.text}</p>
            <span className="transcript-time">
              {entry.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        </div>
      ))}

      {/* Typing indicator while agent is generating */}
      {(status === "THINKING" || status === "SPEAKING") && (
        <div className="transcript-entry agent typing" key="typing-indicator" data-testid="typing-indicator">
          <div className="transcript-avatar">🤖</div>
          <div className="transcript-bubble">
            <span className="transcript-role">VaaniBridge</span>
            <div className="typing-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
