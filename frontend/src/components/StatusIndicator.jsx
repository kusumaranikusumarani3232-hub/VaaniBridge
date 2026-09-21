import { STATUS } from "../hooks/useVoiceAgent";

const STATUS_CONFIG = {
  [STATUS.IDLE]: {
    label: "Ready",
    sublabel: "Click Start Conversation",
    color: "var(--status-idle)",
    pulse: false,
    icon: "○",
  },
  CONNECTING: {
    label: "Connecting",
    sublabel: "Connecting to VaaniBridge...",
    color: "var(--status-connecting)",
    pulse: true,
    icon: "◌",
  },
  CONNECTED: {
    label: "Connected",
    sublabel: "Voice agent connected",
    color: "var(--status-connected)",
    pulse: false,
    icon: "✓",
  },
  LISTENING: {
    label: "Listening",
    sublabel: "Listening...",
    color: "var(--status-listening)",
    pulse: true,
    icon: "◉",
  },
  THINKING: {
    label: "Thinking",
    sublabel: "Processing your message...",
    color: "var(--status-thinking)",
    pulse: true,
    icon: "◈",
  },
  SPEAKING: {
    label: "Speaking",
    sublabel: "VaaniBridge is speaking...",
    color: "var(--status-speaking)",
    pulse: true,
    icon: "▶",
  },
  ERROR: {
    label: "Error",
    sublabel: "Connection problem",
    color: "var(--status-error)",
    pulse: false,
    icon: "✕",
  },
};

export function StatusIndicator({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG[STATUS.IDLE];

  return (
    <div className="status-indicator" data-status={status}>
      <div
        className={`status-dot ${config.pulse ? "pulse" : ""}`}
        style={{ "--dot-color": config.color }}
      >
        <span className="status-icon">{config.icon}</span>
      </div>
      <div className="status-text">
        <span className="status-label" style={{ color: config.color }}>
          {config.label}
        </span>
        <span className="status-sublabel">{config.sublabel}</span>
      </div>
    </div>
  );
}
