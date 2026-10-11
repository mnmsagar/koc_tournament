import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'Kingdom of Chess — Premier Scholastic Tournament Platform',
  description:
    'Experience scholastic chess tournaments with automated instant matchmaking, authoritative clocks, and live leaderboards at Kingdom of Chess.',
  keywords: [
    'Kingdom of Chess',
    'Chess tournaments',
    'Online chess for kids',
    'Scholastic chess India',
    'Live chess pairing',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#faf8f5] text-slate-800 antialiased selection:bg-[#f97316]/20 selection:text-[#f97316] relative overflow-x-hidden flex flex-col"
        suppressHydrationWarning
      >
        <Providers>
          <div className="relative z-10 flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
