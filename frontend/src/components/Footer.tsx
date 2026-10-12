import React from 'react';
import Link from 'next/link';
import { Crown, Trophy, Swords, Shield, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-800/80 bg-[#070d17]/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#f97304] to-[#ea580c] shadow-lg shadow-[#f97304]/30">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                Kingdom of Chess
              </span>
            </Link>
            <p className="max-w-md text-xs leading-relaxed text-slate-400">
              India&apos;s premier platform for young chess minds. Fostering strategic thinking, sportsmanship, and grandmaster habits through automated scholastic tournaments and live competitive match play.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Tournament Servers Active
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Tournament Arena
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/tournaments" className="hover:text-[#f97304] transition">
                  Browse Active Tournaments
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#f97304] transition">
                  Student Sign In
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#f97304] transition">
                  Coach Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Standards */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Fair Play & Rules
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-[#f97304]" />
                Authoritative Move Verification
              </li>
              <li className="flex items-center gap-1.5">
                <Swords className="h-3.5 w-3.5 text-[#14b8a6]" />
                Instant Fair Matchmaking
              </li>
              <li className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                FIDE-Aligned Scoring Standard
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Kingdom of Chess Platform. All rights reserved.</p>
          <p className="flex items-center gap-1 text-slate-400">
            Crafted with <Heart className="h-3.5 w-3.5 text-[#f97304] fill-[#f97304]" /> for aspiring Grandmasters
          </p>
        </div>
      </div>
    </footer>
  );
}
