import type { Metadata } from 'next';
import { CodexIndex } from '@/components/codex/CodexIndex';

/**
 * Codex landing page (#320). Three columns linking to detail pages
 * for every Sefirah, Major Arcanum, and Path.
 *
 * Statically prerendered. Replaces the #313-era placeholder.
 */

export const metadata: Metadata = {
  title: 'Sparks of Kether — Codex',
  description:
    'The symbolic systems of Sparks of Kether: every Sefirah, every Major Arcanum, every Path.',
};

export default function CodexPage(): JSX.Element {
  return <CodexIndex />;
}
