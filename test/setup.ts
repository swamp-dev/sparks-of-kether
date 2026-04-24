import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL's render attaches nodes to document.body; clean up between tests so
// selectors are isolated.
afterEach(() => {
  cleanup();
});
