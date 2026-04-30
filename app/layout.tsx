import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, Frank_Ruhl_Libre, Inter } from 'next/font/google';
import { Starfield } from '@/components/atmosphere/Starfield';
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
        <Starfield />
        {children}
      </body>
    </html>
  );
}
