# VaaniBridge 🌉

**Real-Time Multilingual AI Voice Agent powered by AssemblyAI**

---

## What is VaaniBridge?

VaaniBridge is a real-time AI voice agent that lets you have a natural spoken conversation with an AI — in **English** or **Hindi** — directly in your browser. You speak, the AI listens, thinks, and speaks back.

It is built on AssemblyAI's **Voice Agent API**: a unified, managed pipeline that handles speech recognition (STT), AI reasoning (LLM), and voice synthesis (TTS) over a single WebSocket connection.

---

## Problem

Most AI chat interfaces are text-based. Voice solutions often stitch together separate STT → translation → TTS pipelines, introducing latency, complexity, and multiple failure points. Multilingual support is even harder.

## Solution

VaaniBridge uses AssemblyAI's Voice Agent API as a single, unified pipeline:

```
User Microphone
  → PCM16 audio (24kHz) streamed over WebSocket
  → AssemblyAI Voice Agent (STT + LLM + TTS, managed)
  → Agent audio (PCM16) streamed back
  → Plays in browser via Web Audio API
```

No separate components. No custom translation logic. No browser SpeechSynthesis.

---

## Why it is a Voice Agent (not just STT+TTS)

A **voice agent** is a system where:
1. The AI understands natural speech in context
2. The AI generates a thoughtful, conversational response
3. The AI speaks back naturally

AssemblyAI's Voice Agent API handles all three server-side. VaaniBridge provides the browser microphone → speaker bridge.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                  │
│                                                          │
│  Microphone → AudioWorklet (24kHz PCM16)                 │
│             → base64 encode                              │
│             → WebSocket → AssemblyAI Voice Agent         │
│                                                          │
│  AssemblyAI Voice Agent → reply.audio (base64 PCM16)    │
│  → Web Audio API → Speaker                              │
│                                                          │
│  Transcript: transcript.user / transcript.agent events  │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ POST /api/token (temp token)
                          │
┌─────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                       │
│                                                          │
│  POST /api/token → AssemblyAI token endpoint            │
│  Returns: { token, ws_url }                             │
│                                                          │
│  ASSEMBLYAI_API_KEY stays on server — never sent        │
│  to the browser                                          │
└─────────────────────────────────────────────────────────┘
```

---

## AssemblyAI Integration

| Item | Value |
|---|---|
| **WebSocket endpoint** | `wss://agents.assemblyai.com/v1/ws` |
| **Auth (server)** | `Authorization: Bearer <API_KEY>` header |
| **Auth (browser)** | `?token=<temp_token>` query param |
| **Temp token endpoint** | `POST https://api.assemblyai.com/v2/realtime/token` |
| **Audio input** | PCM16, 24 kHz, mono, base64-encoded |
| **Audio output** | PCM16, 24 kHz, mono, base64-encoded |
| **Model** | Universal-3.5 Pro Realtime (auto) |
| **Client events** | `session.update`, `input.audio`, `session.end` |
| **Server events** | `session.ready`, `transcript.user`, `transcript.agent`, `reply.audio`, `reply.done` |

---

## Supported Languages

| Language | Code | Notes |
|---|---|---|
| English | `en` | Full support |
| Hindi (हिंदी) | `hi` | Full support |

The Universal-3.5 Pro Realtime model supports code-switching — the user can mix languages naturally.

---

## Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- AssemblyAI account with Voice Agent API access

### 1. Clone / open the project

```bash
cd VaaniBridge
```

### 2. Configure API key

```bash
cd backend
cp .env.example .env
# Edit .env and set your real key:
# ASSEMBLYAI_API_KEY=your_real_key_here
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ASSEMBLYAI_API_KEY` | ✅ Yes | Your AssemblyAI API key (backend only) |

The key is **never** sent to the frontend.

---

## Running the Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000

Health check: http://localhost:8000/api/health

---

## Running the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:5173

---

## Demo Mode

Demo Mode simulates a full conversation without using any AssemblyAI credits.

- Toggle: Click **"Try Demo →"** in the header
- Banner clearly states: "Demo Mode — No AssemblyAI credits used"
- Shows all UI states: CONNECTING → LISTENING → THINKING → SPEAKING
- Uses pre-scripted English + Hindi conversation

---

## Real Voice Agent Mode

Real Mode connects to the actual AssemblyAI Voice Agent:

1. Click **"Start Conversation"**
2. Backend generates a temporary token (60-second window)
3. Browser connects to `wss://agents.assemblyai.com/v1/ws?token=...`
4. Microphone audio streams to AssemblyAI
5. AI responds with voice audio
6. Click **"End Conversation"** to cleanly terminate

---

## Security

- `ASSEMBLYAI_API_KEY` stored in `backend/.env` only
- Frontend never receives the permanent API key
- Temporary tokens expire in 60 seconds (connection window)
- `.env` is in `.gitignore`
- API key is never printed in logs

---

## Cost Control

VaaniBridge is designed to minimize credit usage:

- ❌ No auto-connect on page load
- ❌ No background sessions
- ❌ No auto-reconnect loops
- ✅ Microphone starts only after "Start Conversation"
- ✅ `session.end` sent on "End Conversation"
- ✅ Demo Mode uses zero credits

---

## Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

Tests cover:
- Health endpoint
- Token generation
- Invalid API key handling
- Network error handling
- Session lifecycle
- API key not exposed in responses

### Frontend Tests

```bash
cd frontend
npm run test
```

Tests cover:
- App rendering
- All status states (IDLE/CONNECTING/LISTENING/THINKING/SPEAKING/ERROR)
- Transcript user/agent rendering
- Typing indicator states
- Language selector
- Session control buttons
- Demo mode
- Error handling

### Production Build

```bash
cd frontend
npm run build
```

---

## Hackathon Demo Instructions

### Quick Demo (no API key needed)
1. Start frontend: `npm run dev` in `frontend/`
2. Click **"Try Demo →"** in header
3. Click **"Start Conversation"** in Demo panel
4. Watch the simulated English + Hindi conversation

### Real Voice Agent Demo
1. Set `ASSEMBLYAI_API_KEY` in `backend/.env`
2. Start backend: `uvicorn main:app --reload` in `backend/`
3. Start frontend: `npm run dev` in `frontend/`
4. Ensure the mode shows **"Real Voice Agent"**
5. Select language (English or Hindi)
6. Click **"Start Conversation"**
7. Speak naturally — the agent responds with voice
8. Click **"End Conversation"** when done

---

## Project Structure

```
VaaniBridge/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── requirements.txt
│   ├── .env.example
│   └── tests/
│       └── test_backend.py
├── frontend/
│   ├── public/
│   │   └── worklets/
│   │       └── pcm-processor.js   # AudioWorklet (24kHz PCM16)
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceBridge.jsx    # Main panel
│   │   │   ├── StatusIndicator.jsx
│   │   │   ├── AudioVisualizer.jsx
│   │   │   ├── Transcript.jsx
│   │   │   └── LanguageSelector.jsx
│   │   ├── hooks/
│   │   │   ├── useVoiceAgent.js   # Real AssemblyAI connection
│   │   │   └── useDemoAgent.js    # Demo simulation
│   │   ├── demo/
│   │   │   └── demoConversation.js
│   │   ├── test/
│   │   │   ├── setup.js
│   │   │   └── VaaniBridge.test.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```
