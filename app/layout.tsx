import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, Frank_Ruhl_Libre, Inter } from 'next/font/google';
import { Starfield } from '@/components/atmosphere/Starfield';
import { Substrate } from '@/components/atmosphere/Substrate';
import { OrreryBackdrop } from '@/components/atmosphere/OrreryBackdrop';
import { SoundSettingsProvider } from '@/lib/sound/settings';
import { PantheonSettingsProvider } from '@/lib/settings/pantheon';
import './globals.css';

// See `docs/typography.md`. Fraunces carries display copy with optical
// sizing; Frank Ruhl Libre is the Hebrew face Sefaria uses for body
// reading. Inter remains the body-sans workhorse.
const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['opsz'],
});
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const hebrew = Frank_Ruhl_Libre({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-hebrew',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Sparks of Kether',
  description: 'A cooperative ascent up the Kabbalistic Tree of Life.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${hebrew.variable}`}>
      <body className="font-sans">
        {/* #311 atmospheric stack (back → front):
              - Substrate      (-z-20): indigo void + bloom + grain
              - OrreryBackdrop (-z-15): sun + orbiting planets (#636)
              - Starfield      (-z-10): static stars
            Each layer occupies a distinct z-tier so the painting order
            doesn't depend on the DOM ordering below. All three are
            decorative and click-through. */}
        <Substrate />
        <OrreryBackdrop />
        <Starfield />
        {/* #321: sound settings provider. Wraps every route so any
            descendant can call `useSound()` / `useSoundEnabled()`.
            The provider holds a single boolean; all real audio work
            (lazy load, throttle) lives in `useSound`. */}
        <SoundSettingsProvider>
          {/* #548 / Epic #293 Phase A2: pantheon selection context.
              Mounted alongside SoundSettings so any descendant can call
              `usePantheon()` to read the active pantheon. The provider
              persists the chosen id to localStorage. */}
          <PantheonSettingsProvider>{children}</PantheonSettingsProvider>
        </SoundSettingsProvider>
      </body>
    </html>
  );
}
