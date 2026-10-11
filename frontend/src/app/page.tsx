'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import { useAuth } from '../context/AuthContext';
import { ChessBoardComponent } from '../components/ChessBoardComponent';
import {
  Crown,
  Swords,
  Trophy,
  Users,
  Shield,
  ArrowRight,
  Sparkles,
  Timer,
  Zap,
  CheckCircle2,
  Medal,
  ChevronRight,
  RotateCcw,
  Play,
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const [demoFen, setDemoFen] = useState('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
  const [demoMoves, setDemoMoves] = useState<string[]>(['1. e4', 'e5']);
  const demoChessRef = useRef<Chess | null>(null);

  if (!demoChessRef.current) {
    try {
      demoChessRef.current = new Chess('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
    } catch {
      demoChessRef.current = new Chess();
    }
  }

  const handleDemoDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (!demoChessRef.current) return false;
    try {
      const move = demoChessRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
      if (!move) return false;
      setDemoFen(demoChessRef.current.fen());
      setDemoMoves((prev) => [...prev, move.san]);
      return true;
    } catch {
      return false;
    }
  };

  const handleResetDemo = () => {
    if (!demoChessRef.current) return;
    demoChessRef.current.reset();
    setDemoFen(demoChessRef.current.fen());
    setDemoMoves([]);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:pt-16 pb-20 sm:pb-24 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Top Scholastic Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/90 bg-orange-50 px-4 py-1.5 text-xs font-bold text-[#ea580c] mb-6 shadow-sm">
            <Sparkles className="h-4 w-4 animate-spin text-[#ea580c]" />
            <span>INDIA&apos;S PREMIER SCHOLASTIC CHESS LEAGUE</span>
            <span className="h-1 w-1 rounded-full bg-[#ea580c]" />
            <span className="text-amber-800">ROYAL ACADEMY EDITION</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-headline text-3xl font-black tracking-tight text-[#0c2340] sm:text-6xl lg:text-7xl leading-[1.15]">
            Where Young Minds <br />
            <span className="bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#d97706] bg-clip-text text-transparent drop-shadow-sm">
              Compete & Become Champions
            </span>
          </h1>

          {/* Description */}
          <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-sm sm:text-lg text-slate-600 leading-relaxed px-2 font-body">
            Welcome to the official <strong>Kingdom of Chess</strong> digital tournament arena. 
            Experience automated matchmaking pairings, authoritative move validation, synchronized digital clocks, and live tournament leaderboards.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-2">
            {user ? (
              <Link
                href="/tournaments"
                className="koc-btn-primary w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl px-8 py-3.5 sm:py-4 text-sm sm:text-base font-extrabold shadow-md font-headline"
              >
                <Swords className="h-5 w-5" />
                Enter Tournament Arena
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="koc-btn-primary w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl px-8 py-3.5 sm:py-4 text-sm sm:text-base font-extrabold shadow-md font-headline"
                >
                  <Crown className="h-5 w-5" />
                  Sign In to Play
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/tournaments"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-[#0c2340] shadow-sm transition hover:bg-slate-50 hover:border-slate-300 font-headline"
                >
                  Browse Tournaments
                </Link>
              </>
            )}
          </div>

          {/* Quick Platform Metrics Banner */}
          <div className="mt-12 grid grid-cols-2 gap-4 border border-slate-200 bg-white rounded-2xl py-6 sm:grid-cols-4 shadow-sm">
            <div className="flex flex-col items-center">
              <span className="font-mono text-2xl font-black text-[#ea580c]">100%</span>
              <span className="text-xs font-semibold text-slate-500 mt-0.5">Automated Pairing</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-2xl font-black text-emerald-600">0.0s</span>
              <span className="text-xs font-semibold text-slate-500 mt-0.5">Instant Sync (Socket.IO)</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-2xl font-black text-amber-600">FIDE</span>
              <span className="text-xs font-semibold text-slate-500 mt-0.5">Tournament Standard</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-mono text-2xl font-black text-[#0c2340]">Live</span>
              <span className="text-xs font-semibold text-slate-500 mt-0.5">Dynamic Leaderboard</span>
            </div>
          </div>
        </div>

        {/* Live Interactive Match Arena Showcase */}
        <div className="mt-14 koc-card rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-[0_4px_24px_rgba(12,35,64,0.05)] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 mb-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                HEADLINE FEATURE · LIVE MATCH PLAY ARENA
              </div>
              <h2 className="font-headline text-2xl sm:text-3xl font-extrabold text-[#0c2340]">
                Live 1-on-1 Scholastic Chessboard
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-body">
                Drag pieces to test legal moves. Matches feature two-way Socket.IO synchronization, shared countdown clocks, and PGN scoresheets.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDemo}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Board
              </button>
              <Link
                href="/tournaments"
                className="koc-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold shadow-sm font-headline"
              >
                <Swords className="h-4 w-4" />
                Enter Live Arena
              </Link>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 items-center">
            {/* Left: The Chessboard and Clocks */}
            <div className="lg:col-span-7 flex flex-col items-center">
              {/* Opponent Preview Bar */}
              <div className="mb-2.5 flex w-full max-w-[500px] items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs shadow-xs">
                <div className="flex items-center gap-2.5 font-bold text-[#0c2340]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0c2340] text-amber-100 font-bold">♚</span>
                  <div>
                    <span className="font-headline">Marcus Vance (Black)</span>
                    <span className="text-[10px] text-slate-500 block font-normal">1618 Blitz Elo</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-bold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  <Timer className="h-3.5 w-3.5 text-slate-400" />
                  04:32
                </div>
              </div>

              {/* The Chessboard */}
              <div className="w-full max-w-[500px]">
                <ChessBoardComponent
                  position={demoFen}
                  boardOrientation="white"
                  arePiecesDraggable={true}
                  onPieceDrop={handleDemoDrop}
                />
              </div>

              {/* Player Preview Bar */}
              <div className="mt-2.5 flex w-full max-w-[500px] items-center justify-between rounded-xl border border-orange-200 bg-orange-50/70 px-4 py-2.5 text-xs shadow-xs">
                <div className="flex items-center gap-2.5 font-bold text-[#0c2340]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white font-bold">♔</span>
                  <div>
                    <span className="font-headline">Alex Chen (You · White)</span>
                    <span className="text-[10px] text-[#ea580c] block font-semibold">1640 Blitz Elo</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <Timer className="h-3.5 w-3.5" />
                  04:48
                </div>
              </div>
            </div>

            {/* Right: Scoresheet and Live Match Information */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0c2340] flex items-center gap-2 font-headline">
                    <Crown className="h-4 w-4 text-[#ea580c]" />
                    Live Scoresheet
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">SAN PGN</span>
                </div>

                <div className="max-h-[140px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {demoMoves.map((san, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-slate-700">
                        <span className="text-slate-400 text-[10px] w-4">{idx + 1}.</span>
                        <span className="font-bold text-[#0c2340] bg-slate-50 px-1.5 py-0.5 rounded">{san}</span>
                      </div>
                    ))}
                    {demoMoves.length === 0 && (
                      <span className="col-span-2 text-slate-400 text-xs text-center py-2">
                        Move a piece to see moves logged here!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0c2340] mb-3 flex items-center gap-2 font-headline">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Assessment Requirements Verification
                </h4>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong className="text-[#0c2340]">Real-time 2-way sync:</strong> Socket.IO rooms per match</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong className="text-[#0c2340]">FIDE Clocks:</strong> Authoritative countdown & timeout forfeit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong className="text-[#0c2340]">Leaderboard:</strong> Win=1, Draw=0.5, Loss=0 live updates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong className="text-[#0c2340]">Anti-Double-Booking:</strong> Concurrency-safe DB locking</span>
                  </li>
                </ul>

                <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
                  <Link
                    href="/tournaments"
                    className="koc-btn-primary flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold font-headline"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Launch Tournament Match
                  </Link>
                  <Link
                    href="/login"
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Quick Log In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Showcase Grid */}
        <div className="mt-16 sm:mt-20">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#ea580c] font-headline">
              Tournament Architecture
            </h2>
            <p className="mt-2 text-2xl sm:text-4xl font-extrabold text-[#0c2340] font-headline">
              Engineered For Scholastic Excellence
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1 */}
            <div className="koc-card group rounded-2xl p-7 transition duration-200 hover:-translate-y-1 hover:shadow-md border border-slate-200">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200 text-[#ea580c] transition group-hover:scale-105 group-hover:bg-[#ea580c] group-hover:text-white">
                <Swords className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0c2340] font-headline">
                Automated Matchmaking Radar
              </h3>
              <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed font-body">
                Players queue into a concurrency-safe FIFO matchmaking pool. Both competitors are atomically paired and redirected to the live board without manual refreshes.
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-[#ea580c]">
                <Zap className="h-4 w-4" /> Zero duplicate pairings
              </div>
            </div>

            {/* Card 2 */}
            <div className="koc-card group rounded-2xl p-7 transition duration-200 hover:-translate-y-1 hover:shadow-md border border-slate-200">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 transition group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white">
                <Timer className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0c2340] font-headline">
                Authoritative Clocks & Rules
              </h3>
              <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed font-body">
                Legal moves are validated server-side via chess.js. Clocks tick down on authoritative servers with automatic checkmate, stalemate, and resignation settlement.
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <Shield className="h-4 w-4" /> 100% Anti-cheat verification
              </div>
            </div>

            {/* Card 3 */}
            <div className="koc-card group rounded-2xl p-7 transition duration-200 hover:-translate-y-1 hover:shadow-md border border-slate-200">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 transition group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#0c2340] font-headline">
                Real-Time Live Leaderboards
              </h3>
              <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed font-body">
                Standings calculate instantly upon every match conclusion (Win: 1.0, Draw: 0.5, Loss: 0.0) with deterministic tiebreaking to crown champions transparently.
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-amber-600">
                <Medal className="h-4 w-4" /> Instant standings sync
              </div>
            </div>
          </div>
        </div>

        {/* How it Works / 3-Step Flow */}
        <div className="mt-16 sm:mt-20 rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ea580c] font-headline">
              Match Workflow
            </span>
            <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#0c2340] font-headline">
              How a Tournament Round Unfolds
            </h3>
          </div>

          <div className="grid gap-8 md:grid-cols-3 relative">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ea580c] text-white font-black text-lg mb-4 shadow-sm">
                1
              </div>
              <h4 className="text-base font-bold text-[#0c2340] font-headline">Join Tournament</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-xs font-body">
                Log in as a student, browse available rapid/blitz tournaments, and click to enter the player roster.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0c2340] text-white font-black text-lg mb-4 shadow-sm">
                2
              </div>
              <h4 className="text-base font-bold text-[#0c2340] font-headline">Instant Radar Queue</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-xs font-body">
                Hit &ldquo;Find Opponent&rdquo;. The server pairs you with an opponent in real time and launches your live match.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white font-black text-lg mb-4 shadow-sm">
                3
              </div>
              <h4 className="text-base font-bold text-[#0c2340] font-headline">Play & Win Points</h4>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed max-w-xs font-body">
                Make your moves on the interactive board. Clocks tick in real time, and scores update on the live leaderboard.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/tournaments"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-[#ea580c] hover:text-white px-6 py-3 text-xs font-bold text-[#0c2340] transition font-headline"
            >
              Ready to Play? Go to Tournaments
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
