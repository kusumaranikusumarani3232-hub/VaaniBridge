/**
 * Demo conversation data for VaaniBridge Demo Mode.
 * Simulates a realistic multilingual session without consuming AssemblyAI credits.
 */

export const DEMO_CONVERSATION = [
  {
    id: "d1",
    role: "status",
    status: "CONNECTING",
    delay: 0,
  },
  {
    id: "d2",
    role: "status",
    status: "CONNECTED",
    delay: 1200,
  },
  {
    id: "d3",
    role: "agent",
    text: "Hello! I'm VaaniBridge, your multilingual AI voice assistant. How can I help you today?",
    delay: 2000,
    status: "SPEAKING",
  },
  {
    id: "d4",
    role: "status",
    status: "LISTENING",
    delay: 5000,
  },
  {
    id: "d5",
    role: "user",
    text: "Can you tell me about VaaniBridge?",
    delay: 6000,
  },
  {
    id: "d6",
    role: "status",
    status: "THINKING",
    delay: 7500,
  },
  {
    id: "d7",
    role: "agent",
    text: "VaaniBridge is a real-time multilingual AI voice agent. I can understand and respond naturally in both English and Hindi. I'm powered by AssemblyAI's Voice Agent API, which handles speech recognition, AI reasoning, and voice synthesis all in one seamless pipeline.",
    delay: 8500,
    status: "SPEAKING",
  },
  {
    id: "d8",
    role: "status",
    status: "LISTENING",
    delay: 14000,
  },
  {
    id: "d9",
    role: "user",
    text: "क्या आप हिंदी में बात कर सकते हैं?",
    delay: 15500,
  },
  {
    id: "d10",
    role: "status",
    status: "THINKING",
    delay: 17000,
  },
  {
    id: "d11",
    role: "agent",
    text: "हाँ, बिल्कुल! मैं हिंदी में बात कर सकता हूँ। VaaniBridge एक बहुभाषी AI वॉइस एजेंट है जो English और Hindi दोनों भाषाओं में स्वाभाविक रूप से बात कर सकता है।",
    delay: 18000,
    status: "SPEAKING",
  },
  {
    id: "d12",
    role: "status",
    status: "LISTENING",
    delay: 24000,
  },
  {
    id: "d13",
    role: "user",
    text: "That's impressive! How does it work?",
    delay: 26000,
  },
  {
    id: "d14",
    role: "status",
    status: "THINKING",
    delay: 27500,
  },
  {
    id: "d15",
    role: "agent",
    text: "The real voice agent uses AssemblyAI's Voice Agent API — a single WebSocket connection that handles everything: your speech is recognized, processed by an AI model, and the response is synthesized into natural speech and streamed back to you in real-time. No separate translation or TTS pipeline — it's all unified.",
    delay: 28500,
    status: "SPEAKING",
  },
];

export const DEMO_DURATION_MS = 40000;
