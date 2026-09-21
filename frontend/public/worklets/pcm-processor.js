/**
 * PCM Processor AudioWorklet
 * Captures raw microphone PCM16 samples at 24 kHz (or resamples from 48kHz).
 * Posts Float32 chunks to the main thread which will convert and base64-encode.
 *
 * The Voice Agent API requires: PCM16, 24 kHz, mono, signed little-endian.
 */

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._chunkSize = 4800; // 200ms at 24 kHz
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const samples = input[0]; // Float32Array — mono channel
    for (let i = 0; i < samples.length; i++) {
      this._buffer.push(samples[i]);
    }

    // Send chunks to main thread
    while (this._buffer.length >= this._chunkSize) {
      const chunk = this._buffer.splice(0, this._chunkSize);
      this.port.postMessage({ pcmFloat32: new Float32Array(chunk) });
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
