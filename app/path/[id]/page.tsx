import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { paths } from '@/data';
import { PathDetail } from '@/components/codex/PathDetail';
import { pathCodex } from '@/data/codex-content';

/**
 * Per-Path Codex detail page (#320). Statically prerendered for all
 * 22 paths (numbered 11–32) via `generateStaticParams`.
 */

interface PageProps {
  readonly params: { readonly id: string };
}

const VALID_NUMBERS = new Set<number>(paths.map((p) => p.number));

export function generateStaticParams(): { readonly id: string }[] {
  return paths.map((p) => ({ id: String(p.number) }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const n = Number(params.id);
  if (!Number.isInteger(n) || !VALID_NUMBERS.has(n)) {
    return { title: 'Sparks of Kether — Codex' };
  }
  const path = paths.find((p) => p.number === n);
  if (path === undefined) {
    return { title: 'Sparks of Kether — Codex' };
  }
  return {
    title: `Path ${path.number} — Codex`,
    description: pathCodex[n]?.note ?? '',
  };
}

export default function PathPage({ params }: PageProps): JSX.Element {
  const n = Number(params.id);
  if (!Number.isInteger(n) || !VALID_NUMBERS.has(n)) {
    notFound();
  }
  return <PathDetail pathNumber={n} />;
}
