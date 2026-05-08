import { describe, expect, it } from 'vitest';

import { encodeWav } from '../lib/wav';

describe('encodeWav', () => {
  it('writes a valid RIFF/WAVE header for a 1 sample stereo buffer', () => {
    const left = new Float32Array([0]);
    const right = new Float32Array([0]);
    const wav = encodeWav({ left, right, sampleRate: 44100 });
    const ascii = (start: number, len: number) =>
      String.fromCharCode(...Array.from(wav.subarray(start, start + len)));

    expect(ascii(0, 4)).toBe('RIFF');
    expect(ascii(8, 4)).toBe('WAVE');
    expect(ascii(12, 4)).toBe('fmt ');
    expect(ascii(36, 4)).toBe('data');

    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    // fmt chunk size 16, PCM format 1, channels 2
    expect(view.getUint32(16, true)).toBe(16);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44100);
    // bits per sample
    expect(view.getUint16(34, true)).toBe(16);
  });

  it('clips out-of-range samples to int16 bounds without throwing', () => {
    const left = new Float32Array([2, -2, 0]);
    const right = new Float32Array([0, 0, 0]);
    const wav = encodeWav({ left, right, sampleRate: 44100 });
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    // First sample left = +2 → clamps to 32767
    expect(view.getInt16(44, true)).toBe(32767);
    // Second sample left = -2 → clamps to -32767 (symmetric)
    expect(view.getInt16(48, true)).toBe(-32767);
  });

  it('round-trips Float32 → int16 → Float32 within quantisation error', () => {
    const samples = new Float32Array(128);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin((i / samples.length) * Math.PI * 2) * 0.5;
    }
    const wav = encodeWav({ left: samples, right: samples, sampleRate: 44100 });
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    for (let i = 0; i < samples.length; i++) {
      // Interleaved: each frame is 4 bytes (2 channels × int16)
      const decoded = view.getInt16(44 + i * 4, true) / 32767;
      const original = samples[i] ?? 0;
      expect(Math.abs(decoded - original)).toBeLessThan(1 / 32767 + 1e-9);
    }
  });

  it('reports correct file size for a 1-second mono-equivalent stereo buffer', () => {
    const sampleRate = 44100;
    const left = new Float32Array(sampleRate);
    const right = new Float32Array(sampleRate);
    const wav = encodeWav({ left, right, sampleRate });
    // 44 bytes header + sampleRate frames × 2 channels × 2 bytes
    expect(wav.byteLength).toBe(44 + sampleRate * 2 * 2);
  });
});
