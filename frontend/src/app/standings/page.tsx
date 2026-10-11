'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { Tournament, TournamentLeaderboardResponse, LeaderboardEntry } from '../../types';
import {
  Trophy,
  Crown,
  Medal,
  Users,
  Timer,
  Swords,
  ArrowRight,
  Loader2,
  Flame,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Search,
  Check,
} from 'lucide-react';

function StandingsContent() {
  const searchParams = useSearchParams();
  const initialTournamentId = searchParams.get('id');
  const { user } = useAuth();

  // Fetch list of all tournaments
  const {
    data: tournaments,
    isLoading: tournamentsLoading,
  } = useQuery<Tournament[]>({
    queryKey: ['tournaments'],
    queryFn: () => apiRequest<Tournament[]>('/tournaments'),
  });

  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollTrack = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleSelectTournament = (id: string) => {
    setSelectedTournamentId(id);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    if (tournaments && tournaments.length > 0) {
      if (initialTournamentId && tournaments.some((t) => t.id === initialTournamentId)) {
        setSelectedTournamentId(initialTournamentId);
      } else if (!selectedTournamentId) {
        // Default to first open or active tournament, or first in list
        const activeOne = tournaments.find((t) => t.status === 'open' || t.status === 'ongoing');
        setSelectedTournamentId(activeOne ? activeOne.id : tournaments[0].id);
      }
    }
  }, [tournaments, initialTournamentId, selectedTournamentId]);

  // Fetch leaderboard for selected tournament
  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    error: leaderboardError,
  } = useQuery<TournamentLeaderboardResponse>({
    queryKey: ['leaderboard', selectedTournamentId],
    queryFn: () => apiRequest<TournamentLeaderboardResponse>(`/tournaments/${selectedTournamentId}/leaderboard`),
    enabled: !!selectedTournamentId,
    refetchInterval: 5000,
  });

  const selectedTournament = tournaments?.find((t) => t.id === selectedTournamentId);
  const leaderboard = leaderboardData?.leaderboard || [];
  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  const filteredTournaments = React.useMemo(() => {
    if (!tournaments) return [];
    if (!dropdownSearch.trim()) return tournaments;
    const q = dropdownSearch.toLowerCase();
    return tournaments.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.timeControl.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q),
    );
  }, [tournaments, dropdownSearch]);

  if (tournamentsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#ea580c]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 pb-24 md:pb-12">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#ea580c] mb-1">
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-extrabold uppercase tracking-widest font-headline">
              Official Tournament Standings
            </span>
          </div>
          <h1 className="font-headline text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0c2340]">
            League Standings & Rankings
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 font-body">
            FIDE-standard scholastic points leaderboard with live match updates and tiebreaks.
          </p>
        </div>

        {selectedTournament && (
          <Link
            href={`/tournaments/${selectedTournament.id}`}
            className="koc-btn-primary flex items-center justify-center gap-2 rounded-xl py-2.5 px-5 text-xs font-bold font-headline shadow-xs"
          >
            <Swords className="h-4 w-4" />
            Enter {selectedTournament.name}
          </Link>
        )}
      </div>

      {/* Tournament Selection: Horizontal Slider with Left/Right Navigation & Dropdown */}
      <div className="mb-8 koc-card rounded-2xl p-3.5 sm:p-4 border border-slate-200 bg-white shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 font-headline">
              Select Tournament Arena
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
              {tournaments?.length || 0} Arenas Available
            </span>
          </div>

          {/* Quick Dropdown Trigger */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full sm:w-auto flex items-center justify-between gap-2.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#0c2340] text-xs font-bold transition font-headline shadow-2xs"
            >
              <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                <Trophy className="h-3.5 w-3.5 text-[#ea580c] shrink-0" />
                <span className="truncate">
                  {selectedTournament ? selectedTournament.name : 'Choose Arena...'}
                </span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                  isDropdownOpen ? 'rotate-180 text-[#ea580c]' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 max-h-80 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-2 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                <div className="p-1.5 pb-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search arenas by name or time..."
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                </div>
                <div className="pt-1 space-y-1">
                  {filteredTournaments.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTournament(t.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-headline transition ${
                        selectedTournamentId === t.id
                          ? 'bg-orange-50 text-[#ea580c] font-bold'
                          : 'hover:bg-slate-50 text-[#0c2340]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="truncate block font-semibold">{t.name}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono font-normal mt-0.5">
                          <span>{t.timeControl}</span>
                          <span>•</span>
                          <span
                            className={`uppercase text-[9px] font-bold px-1.5 py-0.2 rounded font-headline ${
                              t.status === 'open'
                                ? 'bg-emerald-50 text-emerald-600'
                                : t.status === 'ongoing'
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                      </div>
                      {selectedTournamentId === t.id && (
                        <Check className="h-4 w-4 text-[#ea580c] shrink-0" />
                      )}
                    </button>
                  ))}
                  {filteredTournaments.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 font-body">
                      No matching tournaments found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Slider Track with Arrows */}
        <div className="relative flex items-center gap-2">
          {/* Left Arrow Button */}
          <button
            onClick={() => scrollTrack('left')}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs shrink-0 transition hover:border-[#ea580c] hover:text-[#ea580c]"
            title="Scroll Left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Slider Container Track */}
          <div
            ref={sliderRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5 flex-1"
          >
            {tournaments?.map((t) => {
              const isSelected = selectedTournamentId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTournamentId(t.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition font-headline shrink-0 whitespace-nowrap shadow-2xs ${
                    isSelected
                      ? 'bg-[#0c2340] text-white ring-2 ring-[#ea580c] shadow-sm'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {/* Status Indicator Dot */}
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      t.status === 'open'
                        ? 'bg-emerald-500 animate-pulse'
                        : t.status === 'ongoing'
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-slate-300'
                    }`}
                  />
                  <span>{t.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold ${
                      isSelected
                        ? 'bg-[#ea580c] text-white'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    {t.timeControl}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Arrow Button */}
          <button
            onClick={() => scrollTrack('right')}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs shrink-0 transition hover:border-[#ea580c] hover:text-[#ea580c]"
            title="Scroll Right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {leaderboardLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#ea580c]" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="koc-card rounded-3xl p-12 text-center border border-slate-200 bg-white">
          <Trophy className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="font-headline text-lg font-bold text-[#0c2340]">No Standings Recorded Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-body">
            Matches are waiting to be played in this tournament. Queue up in the radar to generate scores!
          </p>
          {selectedTournament && (
            <Link
              href={`/tournaments/${selectedTournament.id}`}
              className="koc-btn-primary mt-4 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold font-headline"
            >
              Start First Match
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top 3 Podium Showcase */}
          {top1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* #2 Silver (Left) */}
              {top2 ? (
                <div className="order-2 md:order-1 koc-card rounded-2xl p-5 border border-slate-200 bg-white text-center shadow-2xs">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-bold font-headline border border-slate-200">
                    🥈 #2
                  </div>
                  <h4 className="font-headline font-bold text-sm text-[#0c2340] truncate">
                    {top2.name}
                  </h4>
                  <div className="mt-1 flex items-center justify-center gap-1 font-mono text-xs font-bold text-[#ea580c]">
                    <span>{top2.points} pts</span>
                    <span className="text-slate-400 font-normal">({top2.wins}W / {top2.draws}D / {top2.losses}L)</span>
                  </div>
                </div>
              ) : <div className="hidden md:block" />}

              {/* #1 Gold Champion (Center - Prominent) */}
              <div className="order-1 md:order-2 koc-card rounded-3xl p-6 sm:p-7 border-2 border-amber-300 bg-gradient-to-b from-amber-50/50 to-white text-center shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-[#ea580c]" />
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 font-bold font-headline shadow-xs">
                  <Crown className="h-7 w-7 text-amber-600" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 block font-headline">
                  LEADER · 1ST PLACE
                </span>
                <h3 className="font-headline text-lg sm:text-xl font-extrabold text-[#0c2340] mt-0.5 truncate">
                  {top1.name}
                </h3>
                <div className="mt-2 inline-flex items-baseline gap-1.5 font-mono text-2xl font-black text-[#ea580c] bg-white px-4 py-1 rounded-xl border border-amber-200 shadow-2xs">
                  <span>{top1.points}</span>
                  <span className="text-xs font-bold text-slate-500">POINTS</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 font-mono">
                  Record: {top1.wins} Wins • {top1.draws} Draws • {top1.losses} Losses
                </p>
              </div>

              {/* #3 Bronze (Right) */}
              {top3 ? (
                <div className="order-3 koc-card rounded-2xl p-5 border border-slate-200 bg-white text-center shadow-2xs">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold font-headline border border-amber-200">
                    🥉 #3
                  </div>
                  <h4 className="font-headline font-bold text-sm text-[#0c2340] truncate">
                    {top3.name}
                  </h4>
                  <div className="mt-1 flex items-center justify-center gap-1 font-mono text-xs font-bold text-[#ea580c]">
                    <span>{top3.points} pts</span>
                    <span className="text-slate-400 font-normal">({top3.wins}W / {top3.draws}D / {top3.losses}L)</span>
                  </div>
                </div>
              ) : <div className="hidden md:block" />}
            </div>
          )}

          {/* Full Leaderboard Standings Table */}
          <div className="koc-card rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-headline text-base font-bold text-[#0c2340] flex items-center gap-2">
                <Medal className="h-4 w-4 text-[#ea580c]" />
                Full Player Roster Standings
              </h3>
              <span className="text-xs text-slate-500 font-medium font-body">
                {leaderboard.length} Ranked Competitors
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-body">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-headline uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 sm:px-6">Rank</th>
                    <th className="py-3 px-4">Competitor</th>
                    <th className="py-3 px-4 text-center">Score (Pts)</th>
                    <th className="py-3 px-4 text-center">Wins</th>
                    <th className="py-3 px-4 text-center">Draws</th>
                    <th className="py-3 px-4 text-center">Losses</th>
                    <th className="py-3 px-4 text-center">Games</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((entry) => {
                    const isCurrentUser = user?.id === entry.userId;
                    return (
                      <tr
                        key={entry.userId}
                        className={`transition hover:bg-slate-50/80 ${
                          isCurrentUser ? 'bg-orange-50/60 font-bold' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 sm:px-6">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-headline font-bold ${
                            entry.rank === 1
                              ? 'bg-amber-100 text-amber-800'
                              : entry.rank === 2
                              ? 'bg-slate-200 text-slate-700'
                              : entry.rank === 3
                              ? 'bg-amber-50 text-amber-700'
                              : 'text-slate-500'
                          }`}>
                            #{entry.rank}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="font-headline font-bold text-[#0c2340]">
                              {entry.name}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[10px] bg-orange-100 text-[#ea580c] px-2 py-0.5 rounded-full font-bold">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-bold text-sm text-[#ea580c]">
                          {entry.points}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-emerald-700 font-bold">
                          {entry.wins}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-amber-700">
                          {entry.draws}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                          {entry.losses}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                          {entry.gamesPlayed}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scoring Rules Legend */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h4 className="font-headline text-xs font-bold uppercase tracking-wider text-[#0c2340] mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Official FIDE Scoring Standard
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 font-body">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">1.0 Pt</span>
                <span>Win (Checkmate, Timeout, Resignation)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">0.5 Pt</span>
                <span>Draw (Stalemate, Agreement, Repetition)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">0.0 Pt</span>
                <span>Loss (Checkmated, Flag Fall)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StandingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#ea580c]" />
        </div>
      }
    >
      <StandingsContent />
    </Suspense>
  );
}
