import { useState } from "react";
import { VoiceBridge } from "./components/VoiceBridge";

export default function App() {
  const [isDemo, setIsDemo] = useState(false);

  return (
    <div className="app-root">
      {/* Background decoration */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      <main className="main-container">
        {/* Header */}
        <header className="app-header">
          <div className="logo-area">
            <div className="logo-icon" aria-hidden="true">🌉</div>
            <div className="logo-text">
              <h1 className="app-title">VaaniBridge</h1>
              <p className="app-subtitle">Real-Time AI Voice Agent</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="mode-toggle-area">
            <div
              className={`mode-badge ${isDemo ? "demo" : "real"}`}
              id="mode-badge"
            >
              {isDemo ? (
                <>
                  <span className="mode-dot demo-dot" />
                  <span>Demo Mode — No AssemblyAI credits used</span>
                </>
              ) : (
                <>
                  <span className="mode-dot real-dot" />
                  <span>Real Voice Agent</span>
                </>
              )}
            </div>
            <button
              id="btn-mode-toggle"
              className="btn-mode-toggle"
              onClick={() => setIsDemo((v) => !v)}
              aria-label={isDemo ? "Switch to Real Voice Agent" : "Switch to Demo Mode"}
            >
              {isDemo ? "Try Real Agent →" : "Try Demo →"}
            </button>
          </div>
        </header>

        {/* Mode info banner */}
        {isDemo && (
          <div className="demo-banner" role="status" id="demo-banner">
            <span className="demo-banner-icon">🎭</span>
            <div>
              <strong>Demo Mode</strong> — Simulated conversation, no credits consumed.{" "}
              <button
                className="link-btn"
                onClick={() => setIsDemo(false)}
                id="switch-to-real"
              >
                Switch to Real Voice Agent
              </button>
            </div>
          </div>
        )}

        {/* Main panel */}
        <div className="panel-wrapper">
          <VoiceBridge isDemo={isDemo} key={isDemo ? "demo" : "real"} />
        </div>

        {/* Info section */}
        <section className="info-section">
          <div className="info-card" id="info-how-it-works">
            <h2 className="info-title">How it works</h2>
            <ol className="info-steps">
              <li>Click <strong>Start Conversation</strong></li>
              <li>Speak naturally in English or Hindi</li>
              <li>VaaniBridge listens and understands</li>
              <li>AI responds in real-time with natural voice</li>
            </ol>
          </div>
          <div className="info-card" id="info-powered-by">
            <h2 className="info-title">Powered by</h2>
            <ul className="info-stack">
              <li>🎙 <strong>AssemblyAI</strong> Voice Agent API</li>
              <li>⚡ <strong>Universal-3.5 Pro</strong> Realtime model</li>
              <li>🌐 <strong>34 voices</strong>, 99 languages</li>
              <li>🔒 <strong>Secure</strong> token-based auth</li>
            </ul>
          </div>
          <div className="info-card" id="info-languages">
            <h2 className="info-title">Languages</h2>
            <ul className="info-stack">
              <li>🇺🇸 English</li>
              <li>🇮🇳 Hindi (हिंदी)</li>
              <li>Code-switching supported</li>
              <li>Auto language detection</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
