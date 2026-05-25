import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { DialogueLine } from '../DialogueLine';

/**
 * Tests for the DialogueLine component — the single-line dialogue
 * bar that shows one speaker's line at a time.
 *
 * Tests drive both the animating and reduced-motion paths via the
 * `reducedMotion` prop. `onComplete` timing piggybacks on RevealLine's
 * own setTimeout-based signal (the inner component's contract is
 * already pinned in RevealLine.test.tsx).
 */
describe('DialogueLine — structure', () => {
  it('renders the container with data-dialogue-line attribute', () => {
    render(
      <DialogueLine
        speaker="Hermes"
        line="The swiftest roads are the most treacherous."
        variant="avatar"
        accentBorderClass="border-l-hod"
        accentSpeakerClass="text-hod/70"
        reducedMotion={false}
      />,
    );
    expect(document.querySelector('[data-dialogue-line]')).not.toBeNull();
  });

  it('renders the speaker name', () => {
    render(
      <DialogueLine
        speaker="Hermes"
        line="Test line"
        variant="avatar"
        accentBorderClass="border-l-hod"
        accentSpeakerClass="text-hod/70"
        reducedMotion={false}
      />,
    );
    const speaker = document.querySelector('[data-dialogue-speaker]');
    expect(speaker?.textContent).toBe('Hermes');
  });

  it('renders the line text inside a RevealLine', () => {
    render(
      <DialogueLine
        speaker="Hermes"
        line="one two three"
        variant="avatar"
        accentBorderClass="border-l-hod"
        accentSpeakerClass="text-hod/70"
        reducedMotion={false}
      />,
    );
    const revealWords = document.querySelectorAll('[data-reveal-word]');
    expect(revealWords.length).toBe(3);
  });

  it('passes reducedMotion to RevealLine (animating path shows data-reveal-state=animating)', () => {
    render(
      <DialogueLine
        speaker="Hermes"
        line="Test line"
        variant="avatar"
        accentBorderClass="border-l-hod"
        accentSpeakerClass="text-hod/70"
        reducedMotion={false}
      />,
    );
    const reveal = document.querySelector('[data-reveal-line]');
    expect(reveal?.getAttribute('data-reveal-state')).toBe('animating');
  });

  it('reduced-motion: RevealLine renders data-reveal-state=reduced', () => {
    render(
      <DialogueLine
        speaker="Hermes"
        line="Test line"
        variant="avatar"
        accentBorderClass="border-l-hod"
        accentSpeakerClass="text-hod/70"
        reducedMotion={true}
      />,
    );
    const reveal = document.querySelector('[data-reveal-line]');
    expect(reveal?.getAttribute('data-reveal-state')).toBe('reduced');
  });
});

describe('DialogueLine — data attributes by variant', () => {
  it('avatar variant: body carries data-encounter-framing', () => {
    render(
      <DialogueLine
        speaker="Hermes"
        line="Trial begins."
        variant="avatar"
        accentBorderClass="border-l-hod"
        accentSpeakerClass="text-hod/70"
        reducedMotion={false}
      />,
    );
    expect(document.querySelector('[data-encounter-framing]')).not.toBeNull();
    expect(document.querySelector('[data-player-response]')).toBeNull();
    expect(document.querySelector('[data-avatar-verdict]')).toBeNull();
  });

  it('player variant: body carries data-player-response', () => {
    render(
      <DialogueLine
        speaker="♈ Aries"
        line="Watch me now."
        variant="player"
        reducedMotion={false}
      />,
    );
    expect(document.querySelector('[data-player-response]')).not.toBeNull();
    expect(document.querySelector('[data-encounter-framing]')).toBeNull();
    expect(document.querySelector('[data-avatar-verdict]')).toBeNull();
  });

  it('pass variant: body carries data-avatar-verdict, speaker carries data-avatar-name', () => {
    render(
      <DialogueLine
        speaker="Hermes"
        line="You crossed first."
        variant="pass"
        reducedMotion={false}
      />,
    );
    expect(document.querySelector('[data-avatar-verdict]')).not.toBeNull();
    expect(document.querySelector('[data-avatar-name]')).not.toBeNull();
    expect(document.querySelector('[data-encounter-framing]')).toBeNull();
    expect(document.querySelector('[data-player-response]')).toBeNull();
  });

  it('fail variant: body carries data-avatar-verdict, speaker carries data-avatar-name', () => {
    render(
      <DialogueLine
        speaker="Ares"
        line="You fell short."
        variant="fail"
        reducedMotion={false}
      />,
    );
    expect(document.querySelector('[data-avatar-verdict]')).not.toBeNull();
    expect(document.querySelector('[data-avatar-name]')).not.toBeNull();
  });

  it('pass/fail variant: data-avatar-name text includes speaker name and colon', () => {
    render(
      <DialogueLine
        speaker="Hermes"
        line="You crossed first."
        variant="pass"
        reducedMotion={false}
      />,
    );
    const name = document.querySelector('[data-avatar-name]');
    expect(name?.textContent).toBe('Hermes:');
  });

  it('pass/fail: data-dialogue-line carries data-dialogue-variant matching the outcome', () => {
    const { rerender } = render(
      <DialogueLine speaker="Hermes" line="Pass." variant="pass" reducedMotion={false} />,
    );
    expect(document.querySelector('[data-dialogue-line]')?.getAttribute('data-dialogue-variant')).toBe('pass');
    rerender(
      <DialogueLine speaker="Ares" line="Fail." variant="fail" reducedMotion={false} />,
    );
    expect(document.querySelector('[data-dialogue-line]')?.getAttribute('data-dialogue-variant')).toBe('fail');
  });
});

describe('DialogueLine — completion signal', () => {
  it('fires onComplete after the RevealLine timer (animating path)', () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      render(
        <DialogueLine
          speaker="Hermes"
          line="one two three"
          variant="avatar"
          accentBorderClass="border-l-hod"
          accentSpeakerClass="text-hod/70"
          reducedMotion={false}
          onComplete={onComplete}
        />,
      );
      // 3 words × 40ms stagger + 320ms keyframe = 400ms total.
      expect(onComplete).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(399);
      });
      expect(onComplete).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fires onComplete immediately under reduced motion', () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      render(
        <DialogueLine
          speaker="Hermes"
          line="one two three"
          variant="avatar"
          accentBorderClass="border-l-hod"
          accentSpeakerClass="text-hod/70"
          reducedMotion={true}
          onComplete={onComplete}
        />,
      );
      expect(onComplete).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(0);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
