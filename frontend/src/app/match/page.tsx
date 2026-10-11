'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { Match, Tournament } from '../../types';
import {
  Swords,
  Trophy,
  Crown,
  Play,
  ArrowRight,
  Shield,
  Timer,
  Zap,
  Users,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function ActiveMatchPage() {
  const { user, loading: authLoading } = useAuth();

  // Check if player has an active ongoing match
  const {
    data: activeMatch,
    isLoading: matchLoading,
  } = useQuery<Match | null>({
    queryKey: ['active-match'],
    queryFn: () => apiRequest<Match | null>('/matches/active'),
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Also fetch tournaments to allow quick queuing if no active match
  const { data: tournaments } = useQuery<Tournament[]>({
    queryKey: ['tournaments'],
    queryFn: () => apiRequest<Tournament[]>('/tournaments'),
  });

  if (authLoading || (user && matchLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#ea580c]" />
      </div>
    );
  }

  // State 1: Unauthenticated user
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="koc-card rounded-3xl p-8 border border-slate-200 bg-white shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200 text-[#ea580c]">
            <Crown className="h-8 w-8" />
          </div>
          <h2 className="font-headline text-2xl font-bold text-[#0c2340]">Sign In to Check Active Matches</h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 font-body">
            You must be logged in as a student competitor to see your ongoing games and synchronized clocks.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="koc-btn-primary flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-xs font-bold font-headline"
            >
              Sign In to Account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 px-6 text-xs font-bold text-[#0c2340] hover:bg-slate-100 transition font-headline"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 2: User HAS an active match in progress
  if (activeMatch && activeMatch.id) {
    const isWhite = activeMatch.whitePlayerId === user.id;
    const opponent = isWhite ? activeMatch.blackPlayer : activeMatch.whitePlayer;
    const opponentColor = isWhite ? 'Black' : 'White';
    const myColor = isWhite ? 'White' : 'Black';

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 pb-24 md:pb-12">
        <div className="koc-card rounded-3xl p-6 sm:p-10 border border-orange-200 bg-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ea580c] via-amber-400 to-[#0c2340]" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 font-headline mb-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                ROUND IN PROGRESS
              </span>
              <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-[#0c2340]">
                Active Match Detected!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-body">
                You currently have an ongoing game in progress. Re-join the live room immediately to avoid clock timeout.
              </p>
            </div>

            <Link
              href={`/match/${activeMatch.id}`}
              className="koc-btn-primary flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold shadow-md font-headline shrink-0"
            >
              <Play className="h-4 w-4" />
              Resume Live Match
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Match Snapshot Card */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                Your Assigned Color
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xl font-black ${isWhite ? 'text-amber-600' : 'text-[#0c2340]'}`}>
                  {isWhite ? '♔ White' : '♚ Black'}
                </span>
                <span className="text-xs font-medium text-slate-500 font-body">({user.name})</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                Current Opponent
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-black text-[#0c2340]">
                  {opponent?.name || 'Challenger'}
                </span>
                <span className="text-xs font-semibold text-slate-500 font-body">({opponentColor})</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Link
              href={`/match/${activeMatch.id}`}
              className="text-xs font-bold text-[#ea580c] hover:underline flex items-center gap-1 font-headline"
            >
              Enter Interactive Chessboard Arena →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 3: User has NO active match in progress -> Show clean "No Active Match" page
  const openTournament = tournaments?.find((t) => t.status === 'open' || t.status === 'ongoing') || tournaments?.[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 pb-24 md:pb-12">
      {/* Top Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 text-[#ea580c] mb-1">
          <Swords className="h-4 w-4" />
          <span className="text-xs font-extrabold uppercase tracking-widest font-headline">
            Match Telemetry
          </span>
        </div>
        <h1 className="font-headline text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0c2340]">
          Active Match Arena
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 font-body">
          Authoritative real-time games, clocks, and live scholastic pairing status.
        </p>
      </div>

      {/* Main "No Active Match" Showcase Card */}
      <div className="koc-card rounded-3xl p-8 sm:p-12 border border-slate-200 bg-white shadow-sm text-center relative overflow-hidden">
        {/* Top subtle accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-[#ea580c] to-[#0c2340]" />

        {/* Big Emblem */}
        <div className="mx-auto mb-5 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-orange-50 border-2 border-orange-200 text-[#ea580c] shadow-xs">
          <Swords className="h-10 w-10 sm:h-12 sm:w-12" />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 font-headline mb-3">
          {user?.role === 'coach' ? 'TOURNAMENT DIRECTOR · ARBITER MODE' : 'STATUS · IDLE (NOT QUEUED)'}
        </span>

        <h2 className="font-headline text-2xl sm:text-3xl font-extrabold text-[#0c2340]">
          {user?.role === 'coach' ? 'No Matches Under Supervision' : 'No Active Match in Progress'}
        </h2>

        <p className="mx-auto mt-2.5 max-w-lg text-xs sm:text-sm text-slate-500 font-body leading-relaxed">
          {user?.role === 'coach'
            ? 'As an Academy Coach, you organize tournaments and supervise matches. Visit the Tournament Directory to start rounds, inspect student rosters, or spectate live games.'
            : 'You are not currently paired in an ongoing game. To begin playing, join an active scholastic tournament round and queue up via the automated matchmaking radar.'}
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          {user?.role === 'coach' ? (
            <Link
              href="/tournaments"
              className="koc-btn-primary w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-xs sm:text-sm font-bold font-headline shadow-sm"
            >
              <Shield className="h-4 w-4" />
              Tournament Director Hub
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : openTournament ? (
            <Link
              href={`/tournaments/${openTournament.id}`}
              className="koc-btn-primary w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-xs sm:text-sm font-bold font-headline shadow-sm"
            >
              <Zap className="h-4 w-4" />
              Queue in {openTournament.name}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/tournaments"
              className="koc-btn-primary w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-xs sm:text-sm font-bold font-headline shadow-sm"
            >
              <Trophy className="h-4 w-4" />
              Browse Tournaments
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          <Link
            href="/standings"
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-3 px-6 text-xs sm:text-sm font-bold text-[#0c2340] transition font-headline"
          >
            <Trophy className="h-4 w-4 text-amber-500" />
            View Standings
          </Link>
        </div>

        {/* Matchmaking Info Grid */}
        <div className="mt-10 pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-[#ea580c]" />
              <span className="font-headline font-bold text-xs text-[#0c2340]">Strict FIFO</span>
            </div>
            <p className="text-[11px] text-slate-500 font-body leading-normal">
              Players are paired in order of queue arrival with zero duplicate pairings.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="h-4 w-4 text-emerald-600" />
              <span className="font-headline font-bold text-xs text-[#0c2340]">FIDE Clocks</span>
            </div>
            <p className="text-[11px] text-slate-500 font-body leading-normal">
              Digital clocks sync on the backend with authoritative flag-fall timeout adjudication.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="font-headline font-bold text-xs text-[#0c2340]">Rating Band</span>
            </div>
            <p className="text-[11px] text-slate-500 font-body leading-normal">
              Automated ±150 Elo skill rating matching for balanced scholastic games.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
