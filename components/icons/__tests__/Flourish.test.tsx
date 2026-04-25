import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Flourish } from '../Flourish';

describe('Flourish', () => {
  it('is decorative — aria-hidden, role=presentation', () => {
    const { container } = render(<Flourish />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('presentation');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.hasAttribute('data-flourish')).toBe(true);
  });

  it('matches snapshot', () => {
    const { container } = render(<Flourish />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
