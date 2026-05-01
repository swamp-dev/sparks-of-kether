import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sefirot } from '@/data';
import type { SefirahKey } from '@/data';
import { SefirahDetail } from '@/components/codex/SefirahDetail';
import { sefirahCodex } from '@/data/codex-content';

/**
 * Per-Sefirah Codex detail page (#320). Statically prerendered for
 * all 10 Sefirot via `generateStaticParams`.
 */

interface PageProps {
  readonly params: { readonly name: string };
}

const SEFIRAH_KEYS = new Set<string>(sefirot.map((s) => s.key));

function isSefirahKey(value: string): value is SefirahKey {
  return SEFIRAH_KEYS.has(value);
}

export function generateStaticParams(): { readonly name: SefirahKey }[] {
  return sefirot.map((s) => ({ name: s.key }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  if (!isSefirahKey(params.name)) {
    return { title: 'Sparks of Kether — Codex' };
  }
  const sefirah = sefirot.find((s) => s.key === params.name);
  if (sefirah === undefined) {
    return { title: 'Sparks of Kether — Codex' };
  }
  const codex = sefirahCodex[sefirah.key];
  return {
    title: `${sefirah.englishName} (${sefirah.hebrewName}) — Codex`,
    description: `${codex.quote} ${codex.gameRole}`,
  };
}

export default function SefirahPage({ params }: PageProps): JSX.Element {
  if (!isSefirahKey(params.name)) {
    notFound();
  }
  return <SefirahDetail sefirahKey={params.name} />;
}
