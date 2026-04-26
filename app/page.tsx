import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ground p-8 text-center text-veil">
      <h1 className="m-0 font-display text-5xl tracking-widest">Sparks of Kether</h1>
      <p className="mt-4 max-w-lg text-lg opacity-70">
        A cooperative ascent up the Kabbalistic Tree of Life.
      </p>
      <Link
        href="/play"
        className="mt-8 rounded bg-illumination px-6 py-3 font-display tracking-widest text-ground"
      >
        Begin the ascent
      </Link>
    </main>
  );
}
