import Link from 'next/link';
import { HomeRoomForms } from '@/components/setup/HomeRoomForms';
import { Hero } from '@/components/home/Hero';
import { ColorBloom } from '@/components/atmosphere/ColorBloom';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center text-veil">
      <ColorBloom color="#ffd700" position="top" intensity={0.1} />
      <h1 className="m-0 font-display text-5xl tracking-widest">Sparks of Kether</h1>
      <p className="mt-4 max-w-lg text-lg opacity-70">
        A cooperative ascent up the Kabbalistic Tree of Life.
      </p>

      <Hero className="mt-8" />

      <section className="mt-8 w-full max-w-md">
        <HomeRoomForms />

        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-veil/20" />
          <span className="text-xs uppercase tracking-widest opacity-50">or</span>
          <span className="h-px flex-1 bg-veil/20" />
        </div>

        <Link
          href="/play"
          data-home-hotseat
          className="block w-full rounded border border-veil/30 px-6 py-3 font-display tracking-widest hover:border-veil/60"
        >
          Hot-seat / single-machine
        </Link>
      </section>
    </main>
  );
}
