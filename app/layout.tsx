import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Cinzel, Inter, Noto_Sans_Hebrew } from 'next/font/google';
import './globals.css';

const display = Cinzel({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const hebrew = Noto_Sans_Hebrew({
  subsets: ['hebrew'],
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
      <body className="font-sans">{children}</body>
    </html>
  );
}
