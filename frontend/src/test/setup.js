import '@testing-library/jest-dom';

// Mock Web Audio API
global.AudioContext = class MockAudioContext {
  constructor() {
    this.sampleRate = 24000;
    this.state = 'running';
    this.destination = {};
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
      onended: null,
    };
  }
  createBuffer(channels, length, sampleRate) {
    return {
      copyToChannel: () => {},
      length,
      sampleRate,
    };
  }
  createMediaStreamSource() {
    return { connect: () => {} };
  }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  get audioWorklet() {
    return {
      addModule: () => Promise.resolve(),
    };
  }
};

global.AudioWorkletNode = class MockAudioWorkletNode {
  constructor() {
    this.port = { onmessage: null, postMessage: () => {} };
  }
  connect() {}
  disconnect() {}
};

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.OPEN = 1;
    this.CONNECTING = 0;
    this.CLOSED = 3;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    setTimeout(() => this.onopen?.(), 0);
  }
  send(data) { this._lastSent = data; }
  close(code, reason) {
    this.readyState = 3;
    this.onclose?.({ code: code || 1000, reason });
  }
};

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: () =>
    Promise.resolve({
      getTracks: () => [{ stop: () => {} }],
    }),
};

// Mock fetch
global.fetch = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        token: 'mock-token-123',
        ws_url: 'wss://agents.assemblyai.com/v1/ws',
      }),
  });
