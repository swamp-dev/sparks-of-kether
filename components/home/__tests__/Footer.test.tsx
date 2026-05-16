import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '../Footer';

/**
 * Footer — micro-block at the bottom of the home page (#313).
 * Three links: rules (→ /about), source (→ GitHub), Codex
 * (placeholder → /codex).
 */

describe('Footer', () => {
  it('renders the three footer links', () => {
    render(<Footer />);
    const rules = screen.getByRole('link', { name: /read the rules/i });
    const source = screen.getByRole('link', { name: /view source/i });
    const codex = screen.getByRole('link', { name: /^codex$/i });

    expect(rules.getAttribute('href')).toBe('/about');
    expect(source.getAttribute('href')).toBe('https://github.com/swamp-dev/sparks-of-kether');
    // Codex is a placeholder route until #320 lands. Pin the path
    // so the link doesn't silently 404 in a future refactor.
    expect(codex.getAttribute('href')).toBe('/codex');
  });

  it('the external GitHub link opens in a new tab with rel=noopener', () => {
    render(<Footer />);
    const source = screen.getByRole('link', { name: /view source/i });
    expect(source.getAttribute('target')).toBe('_blank');
    expect(source.getAttribute('rel') ?? '').toMatch(/noopener/);
    expect(source.getAttribute('rel') ?? '').toMatch(/noreferrer/);
  });
});
