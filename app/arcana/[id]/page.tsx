import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { arcana } from '@/data';
import { ArcanumDetail } from '@/components/codex/ArcanumDetail';
import { arcanumCodex } from '@/data/codex-content';

/**
 * Per-Arcanum Codex detail page (#320). Statically prerendered for
 * all 22 Major Arcana via `generateStaticParams`.
 */

interface PageProps {
  readonly params: { readonly id: string };
}

const VALID_NUMBERS = new Set<number>(arcana.map((a) => a.number));

export function generateStaticParams(): { readonly id: string }[] {
  return arcana.map((a) => ({ id: String(a.number) }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const n = Number(params.id);
  if (!Number.isInteger(n) || !VALID_NUMBERS.has(n)) {
    return { title: 'Sparks of Kether — Codex' };
  }
  const arc = arcana.find((a) => a.number === n);
  if (arc === undefined) {
    return { title: 'Sparks of Kether — Codex' };
  }
  return {
    title: `${arc.name} — Codex`,
    description: arcanumCodex[n]?.meaning ?? '',
  };
}

export default function ArcanumPage({ params }: PageProps): JSX.Element {
  const n = Number(params.id);
  if (!Number.isInteger(n) || !VALID_NUMBERS.has(n)) {
    notFound();
  }
  return <ArcanumDetail number={n} />;
}
