import Link from 'next/link';
import { HomeRoomForms } from '@/components/setup/HomeRoomForms';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ground p-8 text-center text-veil">
      <h1 className="m-0 font-display text-5xl tracking-widest">Sparks of Kether</h1>
      <p className="mt-4 max-w-lg text-lg opacity-70">
        A cooperative ascent up the Kabbalistic Tree of Life.
      </p>

      <section className="mt-12 w-full max-w-md">
        <HomeRoomForms />
      </section>

      <p className="mt-8 text-xs uppercase tracking-widest opacity-40">
        or play solo against the engine
      </p>
      <Link
        href="/play"
        className="mt-2 rounded border border-veil/30 px-6 py-2 font-display tracking-widest"
      >
        Hot-seat / single-machine
      </Link>
    </main>
  );
}
