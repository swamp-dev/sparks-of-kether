/**
 * Minimal WAV writer: Float32 stereo → 16-bit PCM RIFF/WAVE.
 *
 * No external deps. Header layout follows the canonical 44-byte
 * format that every decoder accepts. Out-of-range samples clip to
 * symmetric int16 bounds (±32767) so a clipped peak is at the
 * loudest representable sample, never wraps.
 */

export type StereoBuffer = {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
};

export function encodeWav(buffer: StereoBuffer): Uint8Array {
  const { left, right, sampleRate } = buffer;
  if (left.length !== right.length) {
    throw new Error(
      `WAV channel length mismatch: left=${left.length} right=${right.length}`,
    );
  }

  const numFrames = left.length;
  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const fileSize = 44 + dataSize;

  const out = new Uint8Array(fileSize);
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);

  writeAscii(out, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // RIFF chunk size = fileSize − 8
  writeAscii(out, 8, 'WAVE');

  writeAscii(out, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  writeAscii(out, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    view.setInt16(offset, floatToInt16(left[i] ?? 0), true);
    view.setInt16(offset + 2, floatToInt16(right[i] ?? 0), true);
    offset += 4;
  }

  return out;
}

function floatToInt16(sample: number): number {
  const clamped = Math.max(-1, Math.min(1, sample));
  return Math.round(clamped * 32767);
}

function writeAscii(buffer: Uint8Array, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    buffer[offset + i] = text.charCodeAt(i);
  }
}
