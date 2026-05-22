import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ArcanumCard } from '../ArcanumCard';
import { arcana, letterByKey } from '@/data';

describe('ArcanumCard — renders all 22 cards', () => {
  it.each(arcana.map((a) => [a.number, a.name] as const))('arcanum %i (%s)', (number, name) => {
    const { container } = render(<ArcanumCard number={number} />);
    const svg = container.querySelector('svg');
    expect(svg, `card ${number}`).not.toBeNull();
    expect(svg?.getAttribute('data-arcanum')).toBe(String(number));
    // aria-label includes name + Hebrew letter name + number per
    // ticket acceptance criteria.
    const arcanum = arcana.find((a) => a.number === number);
    expect(arcanum, `arcanum data for ${number}`).toBeDefined();
    if (!arcanum) return;
    const letter = letterByKey(arcanum.letterKey);
    const aria = svg?.getAttribute('aria-label') ?? '';
    expect(aria).toContain(name);
    expect(aria).toContain(`Arcanum ${number}`);
    expect(aria).toContain(letter.name);
  });
});

describe('ArcanumCard — structural invariants', () => {
  it('uses role=figure with a child <title>', () => {
    const { container } = render(<ArcanumCard number={0} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('role', 'figure');
    expect(svg?.querySelector('title')?.textContent).toMatch(/the fool/i);
  });

  it('renders the Hebrew letter glyph', () => {
    // High Priestess = Gimel (ג). The letter glyph appears in zone=letter.
    const { container } = render(<ArcanumCard number={2} />);
    const letterZone = container.querySelector('[data-zone="letter"]');
    expect(letterZone?.textContent).toContain('ג');
    const text = letterZone?.querySelector('text');
    expect(text?.getAttribute('lang')).toBe('he');
  });

  it('renders a Rider-Waite image for every card', () => {
    for (const arc of arcana) {
      const { container } = render(<ArcanumCard number={arc.number} />);
      const img = container.querySelector('image[href]');
      expect(img, `card ${arc.number}`).not.toBeNull();
      const href = img?.getAttribute('href') ?? '';
      expect(href, `card ${arc.number} href`).toMatch(/^\/rider-waite-cards\/.+\.jpg$/);
    }
  });

  it('renders the card name and attribution in the footer, without a number', () => {
    // The Chariot = #7, attribution Cancer. Name and attribution are lexically
    // distinct, so each assertion independently verifies its own text node.
    // Number is intentionally absent — the Hebrew letter uniquely identifies each card.
    const { container } = render(<ArcanumCard number={7} />);
    const footer = container.querySelector('[data-zone="footer"]');
    expect(footer?.textContent).toMatch(/the chariot/i);
    expect(footer?.textContent).toMatch(/cancer/i);
    expect(footer?.textContent).not.toContain('7');
  });

  it('accepts a full Arcanum record via the `arcanum` prop', () => {
    const arcanum = arcana[5];
    expect(arcanum).toBeDefined();
    if (!arcanum) return;
    const { container } = render(<ArcanumCard arcanum={arcanum} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('data-arcanum')).toBe(String(arcanum.number));
  });

  it('throws when neither `number` nor `arcanum` is provided', () => {
    // React 18 logs the throw as an error; silence the noise so the
    // test output stays readable.
    const original = console.error;
    const noop = (..._args: unknown[]): void => undefined;
    console.error = noop;
    try {
      expect(() => render(<ArcanumCard />)).toThrow();
    } finally {
      console.error = original;
    }
  });
});

describe('ArcanumCard — snapshot per card', () => {
  it.each(arcana.map((a) => [a.number, a.name] as const))(
    'snapshot of arcanum %i (%s)',
    (number) => {
      const { container } = render(<ArcanumCard number={number} />);
      expect(container.firstChild).toMatchSnapshot();
    },
  );
});
