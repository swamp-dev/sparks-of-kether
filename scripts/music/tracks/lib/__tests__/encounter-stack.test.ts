/**
 * Smoke tests for the shared encounter-track builder.
 *
 * Each test renders a tiny config (1 s @ 8 kHz so the suite stays
 * fast — under 50 ms total) and verifies a single contract:
 *
 *   1. Output shape matches durationSec × sampleRate.
 *   2. The crossfaded tail equals the head (loopSeam = 1.000) when the
 *      track is built with content-free events.
 *   3. Disabling a section (no pad / no events) doesn't crash.
 *   4. Negative detuneCents raises a helpful error rather than silently
 *      dropping a voice.
 *
 * Per-Sefirah aesthetic correctness lives in the actual track files
 * and the audition gate; this suite only proves the helper itself
 * doesn't have an off-by-one or a config-switch bug that breaks all
 * 8 tracks at once.
 */

import { describe, it, expect } from 'vitest';

import { buildEncounterTrack, DEFAULT_QA_GATES, type EncounterConfig } from '../encounter-stack';

const SR = 8000;

function minimalDroneConfig(name: string): EncounterConfig {
  return {
    name,
    durationSec: 1,
    crossfadeSec: 0.1,
    warmupSec: 0.2,
    sampleRate: SR,
    seed: 0xabcdef,
    drone: {
      pitchHz: 220,
      detuneCents: 0,
      cutoffCenterHz: 1000,
      cutoffSwingHz: 0,
      cutoffLfoCycles: 0,
      droneGain: 0.1,
    },
    reverb: { tailSec: 0.1, wet: 0.2 },
    qaGates: { ...DEFAULT_QA_GATES },
  };
}

describe('buildEncounterTrack smoke (#528 helper)', () => {
  it('returns a manifest with the configured name + sample rate', () => {
    const track = buildEncounterTrack(minimalDroneConfig('smoke-name'));
    expect(track.name).toBe('smoke-name');
    expect(track.sampleRate).toBe(SR);
    expect(track.durationSec).toBe(1);
  });

  it('forwards qaGates with crossfadeSec stitched on top', () => {
    const track = buildEncounterTrack(minimalDroneConfig('smoke-gates'));
    expect(track.qaGates.crossfadeSec).toBe(0.1);
    expect(track.qaGates.minLufs).toBe(DEFAULT_QA_GATES.minLufs);
    expect(track.qaGates.maxLufs).toBe(DEFAULT_QA_GATES.maxLufs);
    expect(track.qaGates.minLoopSeam).toBe(DEFAULT_QA_GATES.minLoopSeam);
  });

  it('renders left + right channels of length durationSec × sampleRate', () => {
    const track = buildEncounterTrack(minimalDroneConfig('smoke-shape'));
    const buffer = track.render();
    expect(buffer.left.length).toBe(SR * 1);
    expect(buffer.right.length).toBe(SR * 1);
    expect(buffer.sampleRate).toBe(SR);
  });

  it('produces non-silent output for a non-zero drone gain', () => {
    const track = buildEncounterTrack(minimalDroneConfig('smoke-energy'));
    const { left, right } = track.render();
    let energy = 0;
    for (let i = 0; i < left.length; i++) {
      energy += Math.abs(left[i] ?? 0) + Math.abs(right[i] ?? 0);
    }
    expect(energy).toBeGreaterThan(0);
  });

  it('renders cleanly with a pad section', () => {
    const config = minimalDroneConfig('smoke-pad');
    config.pad = {
      pitchesHz: [440, 660],
      chorusCents: 4,
      amCycles: 1,
      gain: 0.05,
      pans: [-0.3, 0.3],
    };
    const buffer = buildEncounterTrack(config).render();
    expect(buffer.left.length).toBe(SR);
  });

  it('renders cleanly with each event kind', () => {
    for (const kind of ['fmBell', 'fmStrike', 'ksPluck'] as const) {
      const config = minimalDroneConfig(`smoke-${kind}`);
      config.events = {
        kind,
        pitchesHz: [880, 1100],
        avgIntervalSec: 0.3,
        jitterSec: 0.05,
        panRange: 0.5,
        decaySec: 0.1,
        gain: 0.1,
        tailSafetySec: 0.15,
      };
      const buffer = buildEncounterTrack(config).render();
      expect(buffer.left.length).toBe(SR);
    }
  });

  it('rejects negative drone.detuneCents with a helpful error', () => {
    const config = minimalDroneConfig('smoke-bad-detune');
    if (config.drone === undefined) throw new Error('test setup expects drone');
    config.drone.detuneCents = -5;
    const track = buildEncounterTrack(config);
    expect(() => track.render()).toThrow(/detuneCents must be >= 0/);
  });

  it('crossfade extracts tail content from the head (loopSeam ≈ 1) when a drone is configured', async () => {
    const { loopSeamCorrelation } = await import('../../../lib/qa');
    const config = minimalDroneConfig('smoke-seam');
    // Wider warmup + bigger LFO cycle so the drone has steady-state
    // content to wrap. 4 cycles over loopSpan = 0.9 s ≈ 4.44 Hz.
    config.warmupSec = 0.4;
    if (config.drone !== undefined) {
      config.drone.cutoffSwingHz = 200;
      config.drone.cutoffLfoCycles = 4;
    }
    const buffer = buildEncounterTrack(config).render();
    // After head→tail crossfade, tail content equals head content
    // modulo reverb fuzz; correlation should be close to 1.
    const seam = loopSeamCorrelation(buffer, { crossfadeSec: 0.1 });
    expect(seam).toBeGreaterThan(0.95);
  });

  it('renders cleanly when no drone is configured (#528 follow-up)', () => {
    const config = minimalDroneConfig('smoke-no-drone');
    delete config.drone;
    config.pad = {
      pitchesHz: [440, 660],
      chorusCents: 4,
      amCycles: 1,
      gain: 0.05,
      pans: [-0.3, 0.3],
    };
    const buffer = buildEncounterTrack(config).render();
    expect(buffer.left.length).toBe(SR);
    let energy = 0;
    for (let i = 0; i < buffer.left.length; i++) {
      energy += Math.abs(buffer.left[i] ?? 0);
    }
    expect(energy).toBeGreaterThan(0); // pad alone still produces signal
  });
});
