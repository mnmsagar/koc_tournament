'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { apiRequest } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import { TournamentLeaderboardResponse } from '../../../types';
import {
  Trophy,
  Swords,
  Users,
  Timer,
  Crown,
  CheckCircle,
  AlertCircle,
  Loader2,
  XCircle,
  Shield,
  Medal,
  Radio,
  ArrowLeft,
  Flame,
  Sparkles,
  ArrowRight,
  Clock,
  Eye,
  CheckCircle2,
  Copy,
  Check,
  Search,
  Share2,
  Trash2,
  Play,
  Award,
  Calendar,
} from 'lucide-react';

function TournamentDetailContent() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isQueuing, setIsQueuing] = useState(false);
  const [queueElapsed, setQueueElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'matches'>('leaderboard');
  const [matchedData, setMatchedData] = useState<{ matchId: string; side: string } | null>(null);
  const [countdown, setCountdown] = useState(3);

  // Coach-specific state
  const [copiedLink, setCopiedLink] = useState(false);
  const [coachTab, setCoachTab] = useState<'roster' | 'matches' | 'standings' | 'settings'>('roster');
  const [rosterSearch, setRosterSearch] = useState('');
  const [matchStatusFilter, setMatchStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const formatTournamentSchedule = (startDateString?: string, endDateString?: string) => {
    if (!startDateString) return 'Season 2026';
    try {
      const start = new Date(startDateString);
      if (isNaN(start.getTime())) return 'Season 2026';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const formatTime = (d: Date) => {
        let h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
      };

      if (!endDateString) {
        return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()} • ${formatTime(start)}`;
      }

      const end = new Date(endDateString);
      if (isNaN(end.getTime())) {
        return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()} • ${formatTime(start)}`;
      }

      const isSameDay =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate();

      if (isSameDay) {
        return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()} • ${formatTime(start)} – ${formatTime(end)}`;
      }

      if (start.getFullYear() === end.getFullYear()) {
        return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
      }

      return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
    } catch {
      return 'Season 2026';
    }
  };

  const formatTournamentDate = (dateString?: string, endDateString?: string) => {
    return formatTournamentSchedule(dateString, endDateString);
  };

  // Fetch Tournament details
  const {
    data: tournament,
    isLoading: isTournLoading,
    error: tournError,
  } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => apiRequest<any>(`/tournaments/${id}`),
  });

  // Fetch Leaderboard
  const { data: leaderboardData } = useQuery<TournamentLeaderboardResponse>({
    queryKey: ['leaderboard', id],
    queryFn: () => apiRequest<TournamentLeaderboardResponse>(`/tournaments/${id}/leaderboard`),
    refetchInterval: 5000,
  });

  // Join Tournament mutation
  const joinMutation = useMutation({
    mutationFn: () => apiRequest(`/tournaments/${id}/join`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', id] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to join tournament');
    },
  });

  // Coach update tournament status
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      apiRequest(`/tournaments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', id] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update tournament status');
    },
  });

  // Coach delete tournament mutation
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/tournaments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      router.push('/tournaments');
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to delete tournament');
    },
  });

  const isUserJoined = tournament?.participants?.some((p: any) => p.userId === user?.id);

  // Setup Socket.IO for matchmaking
  useEffect(() => {
    if (!user || user.role !== 'student') return;

    const socket = getSocket();

    const onMatched = (data: { matchId: string; tournamentId: string; side: string }) => {
      setIsQueuing(false);
      setMatchedData({ matchId: data.matchId, side: data.side });
      setCountdown(3);

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            router.push(`/match/${data.matchId}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const onQueued = () => {
      setIsQueuing(true);
    };

    const onCancelled = () => {
      setIsQueuing(false);
    };

    const onError = (data: { message: string }) => {
      setIsQueuing(false);
      setErrorMessage(data.message);
    };

    socket.on('matchmaking:matched', onMatched);
    socket.on('matchmaking:queued', onQueued);
    socket.on('matchmaking:cancelled', onCancelled);
    socket.on('match:error', onError);

    return () => {
      socket.off('matchmaking:matched', onMatched);
      socket.off('matchmaking:queued', onQueued);
      socket.off('matchmaking:cancelled', onCancelled);
      socket.off('match:error', onError);
    };
  }, [user, router]);

  // Queue timer ticker
  useEffect(() => {
    let timer: any;
    if (isQueuing) {
      timer = setInterval(() => {
        setQueueElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setQueueElapsed(0);
    }
    return () => clearInterval(timer);
  }, [isQueuing]);

  const handleStartQueue = () => {
    setErrorMessage(null);
    const socket = getSocket();
    setIsQueuing(true);
    socket.emit('matchmaking:join', { tournamentId: id });
  };

  const handleCancelQueue = () => {
    const socket = getSocket();
    setIsQueuing(false);
    socket.emit('matchmaking:cancel', { tournamentId: id });
  };

  if (isTournLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#f97316]" />
      </div>
    );
  }

  if (tournError || !tournament) {
    return (
      <div className="mx-auto max-w-4xl p-8 text-center text-red-500">
        <AlertCircle className="mx-auto h-12 w-12 mb-3" />
        <h2 className="text-xl font-bold">Tournament not found</h2>
        <Link href="/tournaments" className="mt-4 inline-block text-xs font-bold text-slate-600 underline">
          Return to Tournaments
        </Link>
      </div>
    );
  }

  const userLeaderboardEntry = leaderboardData?.leaderboard?.find((p) => p.userId === user?.id);
  const userRank = userLeaderboardEntry ? userLeaderboardEntry.rank : 4;
  const userScore = userLeaderboardEntry ? userLeaderboardEntry.points : 0;
  const userWins = userLeaderboardEntry ? userLeaderboardEntry.wins : 0;
  const userDraws = userLeaderboardEntry ? userLeaderboardEntry.draws : 0;
  const userLosses = userLeaderboardEntry ? userLeaderboardEntry.losses : 0;

  const formatTimer = (seconds: number) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // ==========================================
  // COACH VIEW: Tournament Director & Arbiter Console
  // ==========================================
  if (user?.role === 'coach') {
    const activeLiveMatches = tournament.matches?.filter((m: any) => m.status === 'active') || [];
    const completedMatches = tournament.matches?.filter((m: any) => m.status !== 'active') || [];
    const isMyTournament = tournament.createdBy === user?.id;

    const filteredRoster = tournament.participants?.filter((p: any) => {
      if (!rosterSearch.trim()) return true;
      const q = rosterSearch.toLowerCase();
      return (
        (p.userName && p.userName.toLowerCase().includes(q)) ||
        (p.userEmail && p.userEmail.toLowerCase().includes(q))
      );
    }) || [];

    const displayedMatches = tournament.matches?.filter((m: any) => {
      if (matchStatusFilter === 'all') return true;
      if (matchStatusFilter === 'active') return m.status === 'active';
      if (matchStatusFilter === 'completed') return m.status !== 'active';
      return true;
    }) || [];

    const topThree = leaderboardData?.leaderboard?.slice(0, 3) || [];

    return (
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 md:px-8 py-5 sm:py-7 flex flex-col gap-6 pb-24 md:pb-12 font-body">
        {/* Top Header & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0c2340] transition font-headline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tournament Directory
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
              Arena ID: #{tournament.id.slice(0, 8).toUpperCase()}
            </span>
            {tournament.status === 'open' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 font-headline">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Registration Open
              </span>
            )}
            {tournament.status === 'ongoing' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#ea580c] font-headline">
                <span className="h-2 w-2 rounded-full bg-[#ea580c] animate-ping" />
                Live Round Active
              </span>
            )}
            {tournament.status === 'completed' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 font-headline">
                🏆 Event Concluded
              </span>
            )}
          </div>
        </div>

        {/* 1. Director & Chief Arbiter Identity Hero */}
        <section className="relative w-full rounded-3xl bg-gradient-to-r from-[#0c2340] via-[#123158] to-[#0c2340] text-white p-5 sm:p-7 shadow-lg border border-[#163a66] overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#ea580c]/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Identity Info with Coach Avatar */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-orange-50 border-2 border-orange-300 overflow-hidden shadow-md flex items-center justify-center">
                  <img
                    alt={user?.name || 'Tournament Director'}
                    className="w-full h-full object-cover"
                    src="/avatars/coach.png"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[#0c2340] shadow-md ring-2 ring-white">
                  <Shield className="h-3 w-3 fill-current" />
                </span>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-headline text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight truncate">
                    {user?.name || 'Coach Fischer'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-extrabold font-headline flex items-center gap-1">
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                    Tournament Director & Chief Arbiter
                  </span>
                </div>
                <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-1">
                  <span className="font-medium text-slate-200">Presiding over: <strong>{tournament.name}</strong></span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-xs text-slate-300 font-semibold bg-white/10 px-2 py-0.5 rounded">
                    Format: {tournament.timeControl} Rapid
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs text-amber-300 font-semibold flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    <Calendar className="h-3 w-3 text-amber-400" />
                    Schedule: {formatTournamentSchedule(tournament.startDate || tournament.createdAt, tournament.endDate)}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Operations Actions in Hero */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
              <button
                onClick={handleCopyLink}
                className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-bold text-white transition font-headline flex items-center gap-2 shadow-sm"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-300">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 text-orange-300" />
                    <span>Copy Student Invite</span>
                  </>
                )}
              </button>

              {isMyTournament ? (
                <>
                  {tournament.status === 'open' && (
                    <button
                      onClick={() => updateStatusMutation.mutate('ongoing')}
                      disabled={updateStatusMutation.isPending}
                      className="koc-btn-primary rounded-xl px-5 py-2.5 text-xs font-extrabold font-headline flex items-center gap-2 shadow-md"
                    >
                      <Play className="h-4 w-4" />
                      {updateStatusMutation.isPending ? 'Starting Round...' : 'Launch Tournament Round'}
                    </button>
                  )}

                  {tournament.status === 'ongoing' && (
                    <button
                      onClick={() => {
                        if (confirm('Conclude this tournament? This will freeze the standings and archive matches.')) {
                          updateStatusMutation.mutate('completed');
                        }
                      }}
                      disabled={updateStatusMutation.isPending}
                      className="rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2.5 text-xs font-extrabold text-white font-headline flex items-center gap-2 shadow-md transition"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {updateStatusMutation.isPending ? 'Finalizing...' : 'Conclude Tournament'}
                    </button>
                  )}

                  {(tournament.status === 'open' || tournament.status === 'draft') && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete tournament "${tournament.name}"? This action cannot be reversed.`)) {
                          deleteMutation.mutate();
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="rounded-xl border border-rose-400/40 bg-rose-500/20 hover:bg-rose-500/30 px-3.5 py-2.5 text-xs font-bold text-rose-200 transition font-headline flex items-center gap-1.5"
                      title="Delete Tournament"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-300" />
                      <span>Delete</span>
                    </button>
                  )}
                </>
              ) : (
                <span className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-slate-300 font-headline flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-amber-400" />
                  Arbiter Observer Mode
                </span>
              )}
            </div>
          </div>

          {/* Director Telemetry Strip */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 font-headline">
                Registered Competitors
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-white mt-0.5 block">
                {tournament.participants?.length || 0}
              </span>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 font-headline">
                Total Matches
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-orange-400 mt-0.5 block">
                {tournament.matches?.length || 0}
              </span>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 font-headline">
                Live Boards Playing
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400 mt-0.5 block">
                {activeLiveMatches.length}
              </span>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 font-headline">
                FIDE Clock Mode
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-white mt-1 block">
                {tournament.timeControl} ({Math.floor(tournament.initialTimeSeconds / 60)}m+{tournament.incrementSeconds}s)
              </span>
            </div>
          </div>
        </section>

        {/* Error notification */}
        {errorMessage && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 2. Director Tabs Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setCoachTab('roster')}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-headline transition flex items-center gap-1.5 ${
                coachTab === 'roster'
                  ? 'bg-white text-[#0c2340] shadow-2xs'
                  : 'text-slate-600 hover:text-[#0c2340]'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-blue-600" />
              Competitors Roster ({tournament.participants?.length || 0})
            </button>
            <button
              onClick={() => setCoachTab('matches')}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-headline transition flex items-center gap-1.5 ${
                coachTab === 'matches'
                  ? 'bg-white text-[#0c2340] shadow-2xs'
                  : 'text-slate-600 hover:text-[#0c2340]'
              }`}
            >
              <Swords className="h-3.5 w-3.5 text-[#ea580c]" />
              Live Arbiter Deck ({tournament.matches?.length || 0})
            </button>
            <button
              onClick={() => setCoachTab('standings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-headline transition flex items-center gap-1.5 ${
                coachTab === 'standings'
                  ? 'bg-white text-[#0c2340] shadow-2xs'
                  : 'text-slate-600 hover:text-[#0c2340]'
              }`}
            >
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              Live Standings ({leaderboardData?.leaderboard?.length || 0})
            </button>
            <button
              onClick={() => setCoachTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-headline transition flex items-center gap-1.5 ${
                coachTab === 'settings'
                  ? 'bg-white text-[#0c2340] shadow-2xs'
                  : 'text-slate-600 hover:text-[#0c2340]'
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-slate-500" />
              Rules & Config
            </button>
          </div>
        </div>

        {/* 3. Director Tab Contents */}
        {coachTab === 'roster' && (
          <div className="flex flex-col gap-4">
            {/* Search and Roster Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter registered students by name or email..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-[#0c2340] placeholder-slate-400 focus:outline-none focus:border-[#ea580c]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 font-headline">
                  Showing {filteredRoster.length} of {tournament.participants?.length || 0} students
                </span>
                <button
                  onClick={handleCopyLink}
                  className="rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3.5 py-2 text-xs font-bold text-[#ea580c] transition font-headline flex items-center gap-1.5"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Invite More
                </button>
              </div>
            </div>

            {/* Roster Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-headline">
                    <tr>
                      <th className="py-3 px-4">Seed</th>
                      <th className="py-3 px-4">Competitor Student</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4 text-center">Current Points</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4 text-right">Roster Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-body">
                    {filteredRoster.map((p: any, idx: number) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-400">
                          #{idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center font-bold text-xs text-[#ea580c] font-headline">
                              {p.userName ? p.userName.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <div className="font-bold text-[#0c2340] font-headline">
                                {p.userName || 'Student Competitor'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Student ID: #{p.userId?.slice(0, 8) || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                          {p.userEmail || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono text-xs font-black text-[#ea580c] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg">
                            {p.score || 0} pts
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                          {formatTournamentDate(p.joinedAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 font-headline">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active Competitor
                          </span>
                        </td>
                      </tr>
                    ))}

                    {filteredRoster.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                          <h4 className="font-headline text-base font-bold text-[#0c2340]">
                            No registered students found
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            Share the tournament invite link with your students. Once they enroll, their details will appear in this roster.
                          </p>
                          <button
                            onClick={handleCopyLink}
                            className="koc-btn-primary mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            Copy Student Invite Link
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {coachTab === 'matches' && (
          <div className="flex flex-col gap-4">
            {/* Filter Sub-bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMatchStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-headline transition ${
                    matchStatusFilter === 'all'
                      ? 'bg-[#0c2340] text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All Matches ({tournament.matches?.length || 0})
                </button>
                <button
                  onClick={() => setMatchStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-headline transition ${
                    matchStatusFilter === 'active'
                      ? 'bg-[#ea580c] text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  🔴 Live Ongoing ({activeLiveMatches.length})
                </button>
                <button
                  onClick={() => setMatchStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-headline transition ${
                    matchStatusFilter === 'completed'
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Concluded ({completedMatches.length})
                </button>
              </div>

              <span className="text-xs text-slate-500 font-mono font-medium">
                Live Arbiter Supervision: Active WebSocket Sync
              </span>
            </div>

            {/* Matches Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedMatches.map((match: any) => {
                const isLive = match.status === 'active';
                let resultBadge = (
                  <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Pending
                  </span>
                );

                if (isLive) {
                  resultBadge = (
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Live Round Active
                    </span>
                  );
                } else if (match.result === 'white') {
                  resultBadge = (
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                      1 - 0 (White Won)
                    </span>
                  );
                } else if (match.result === 'black') {
                  resultBadge = (
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                      0 - 1 (Black Won)
                    </span>
                  );
                } else if (match.result === 'draw') {
                  resultBadge = (
                    <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                      ½ - ½ (Draw)
                    </span>
                  );
                }

                return (
                  <div
                    key={match.id}
                    className={`koc-card rounded-2xl p-5 border transition flex flex-col justify-between ${
                      isLive
                        ? 'border-orange-300 bg-white shadow-md ring-1 ring-orange-200'
                        : 'border-slate-200 bg-white shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                          Board #{match.id.slice(0, 6)}
                        </span>
                        {resultBadge}
                      </div>

                      {/* Opponents Pair */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-800 text-xs font-bold shadow-2xs">
                              ♔
                            </span>
                            <span className="font-bold text-[#0c2340] font-headline">
                              {match.whitePlayerName || 'White Competitor'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-700">
                            {match.result === 'white' ? '1' : match.result === 'black' ? '0' : match.result === 'draw' ? '½' : '—'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0c2340] text-white text-xs font-bold shadow-2xs">
                              ♚
                            </span>
                            <span className="font-bold text-[#0c2340] font-headline">
                              {match.blackPlayerName || 'Black Competitor'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-700">
                            {match.result === 'black' ? '1' : match.result === 'white' ? '0' : match.result === 'draw' ? '½' : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-100 capitalize">
                        {isLive ? 'Authoritative clocks synchronized' : match.terminationReason ? `Decided by ${match.terminationReason}` : 'Match completed'}
                      </div>
                    </div>

                    {/* Arbiter Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <Link
                        href={`/match/${match.id}`}
                        className={`w-full text-center rounded-xl py-2 px-3 text-xs font-bold font-headline transition flex items-center justify-center gap-1.5 ${
                          isLive
                            ? 'bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-xs'
                            : 'border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#0c2340]'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {isLive ? 'Spectate Live Board' : 'Review Match Record'}
                      </Link>
                    </div>
                  </div>
                );
              })}

              {displayedMatches.length === 0 && (
                <div className="sm:col-span-2 lg:col-span-3 py-16 text-center bg-white rounded-3xl border border-slate-200">
                  <Swords className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <h4 className="font-headline text-base font-bold text-[#0c2340]">
                    No matches generated in this arena yet
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Once registered students click &quot;Find Opponent&quot;, automated pairings will assemble live boards here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {coachTab === 'standings' && (
          <div className="flex flex-col gap-6">
            {/* Top 3 Podium for Coach */}
            {topThree.length >= 1 && (
              <div className="grid gap-4 sm:grid-cols-3">
                {topThree.map((entry, idx) => {
                  const placeColors = [
                    { border: 'border-amber-400', bg: 'bg-amber-50', medal: '🥇 1st Place (Gold)' },
                    { border: 'border-slate-300', bg: 'bg-slate-50', medal: '🥈 2nd Place (Silver)' },
                    { border: 'border-amber-700/40', bg: 'bg-orange-50/50', medal: '🥉 3rd Place (Bronze)' },
                  ][idx] || { border: 'border-slate-200', bg: 'bg-slate-50', medal: `#${idx + 1}` };

                  return (
                    <div
                      key={entry.userId}
                      className={`koc-card rounded-3xl p-6 border-2 ${placeColors.border} ${placeColors.bg} shadow-sm text-center flex flex-col justify-between`}
                    >
                      <div>
                        <div className="font-headline text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                          {placeColors.medal}
                        </div>
                        <h4 className="font-headline text-lg sm:text-xl font-extrabold text-[#0c2340]">
                          {entry.name}
                        </h4>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {entry.email}
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200/60">
                        <span className="font-mono text-2xl font-black text-[#ea580c]">
                          {entry.points} pts
                        </span>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">
                          {entry.wins}W • {entry.draws}D • {entry.losses}L
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Complete Standings Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-headline text-base font-bold text-[#0c2340]">
                    Official Tournament Standings
                  </h4>
                  <p className="text-xs text-slate-500">Certified by FIDE Chief Arbiter</p>
                </div>
                <Link
                  href="/standings"
                  className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 font-headline"
                >
                  Global Standings
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-headline">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Competitor</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4 text-center">W / D / L</th>
                      <th className="py-3 px-4 text-center">Rounds Played</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-body">
                    {leaderboardData?.leaderboard?.map((entry) => (
                      <tr key={entry.userId} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-400">
                          #{entry.rank}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#0c2340] font-headline">{entry.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{entry.email}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono text-xs font-black text-[#ea580c] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg">
                            {entry.points} pts
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs">
                          <span className="text-emerald-600 font-bold">{entry.wins}W</span>{' '}
                          <span className="text-slate-400">/</span>{' '}
                          <span className="text-slate-500 font-bold">{entry.draws}D</span>{' '}
                          <span className="text-slate-400">/</span>{' '}
                          <span className="text-rose-500 font-bold">{entry.losses}L</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-500">
                          {entry.gamesPlayed}
                        </td>
                      </tr>
                    ))}

                    {(!leaderboardData?.leaderboard || leaderboardData.leaderboard.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                          No tournament results recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {coachTab === 'settings' && (
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Clock & Timing Specs */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Timer className="h-5 w-5 text-[#ea580c]" />
                <h4 className="font-headline text-base font-bold text-[#0c2340]">
                  Time Control & Authoritative Clocks
                </h4>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#ea580c]" />
                    Tournament Schedule
                  </span>
                  <span className="font-mono font-bold text-[#0c2340]">
                    {formatTournamentSchedule(tournament.startDate || tournament.createdAt, tournament.endDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600">Base Time per Player</span>
                  <span className="font-mono font-bold text-[#0c2340]">
                    {Math.floor(tournament.initialTimeSeconds / 60)} Minutes ({tournament.initialTimeSeconds}s)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600">Increment per Move</span>
                  <span className="font-mono font-bold text-[#0c2340]">
                    +{tournament.incrementSeconds} Seconds
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600">Server Clock Synchronization</span>
                  <span className="font-bold text-emerald-600">Authoritative WebSocket Push</span>
                </div>
              </div>
            </div>

            {/* Arbitration & Fair Play Policies */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Shield className="h-5 w-5 text-emerald-600" />
                <h4 className="font-headline text-base font-bold text-[#0c2340]">
                  FIDE Fair Play & Anti-Cheat Protocols
                </h4>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600">Move Legality Engine</span>
                  <span className="font-bold text-[#0c2340]">Chess.js FIDE Strict Rules</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600">Pairing Algorithm</span>
                  <span className="font-mono font-bold text-[#0c2340]">FIFO + Elo Window ±150</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600">Arbiter Jurisdiction</span>
                  <span className="font-bold text-[#ea580c]">{user?.name || 'Coach Fischer'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // STUDENT VIEW: Player Dashboard & Matchmaking Radar
  // ==========================================
  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 md:px-8 py-5 sm:py-7 flex flex-col gap-6 pb-24 md:pb-12">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0c2340] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tournament Directory
        </Link>
        <span className="font-mono text-xs font-semibold text-slate-400">
          Arena ID: #{tournament.id.slice(0, 8)}
        </span>
      </div>

      {/* 2. Student Telemetry & Identity Banner (Stitch Spec) */}
      <section className="relative w-full rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 md:p-7 shadow-[0_4px_20px_rgba(12,35,64,0.04)] overflow-hidden">
        {/* Ambient Top Gradient Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#f97316] via-amber-400 to-[#0c2340]" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          {/* Identity Info with Official Student Avatar */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-50 border-2 border-orange-200 overflow-hidden shadow-sm flex items-center justify-center">
                <img
                  alt={user?.name || 'Competitor'}
                  className="w-full h-full object-cover"
                  src="/avatars/alex.png"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-emerald-200">
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500 animate-pulse" />
              </span>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-headline text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0c2340] tracking-tight truncate">
                  {user?.name || 'Competitor'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] sm:text-xs font-bold font-headline flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  Gold Candidate
                </span>
              </div>
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                <span className="font-medium text-slate-700">National Scholastic Circuit</span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                  ID: #KC-9821-BLZ
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-[#f97316] font-semibold">Kingdom of Chess Academy</span>
              </p>
            </div>
          </div>

          {/* Stats Strip */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
            {/* Rating Card */}
            <div className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col min-w-[120px]">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider font-headline">
                Rating (Blitz)
              </span>
              <div className="flex items-baseline gap-1.5 sm:gap-2 mt-0.5">
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#0c2340]">1640</span>
                <span className="font-mono text-[11px] sm:text-xs font-bold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                  +18 today
                </span>
              </div>
            </div>

            {/* Streak Card */}
            <div className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col min-w-[110px]">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider font-headline">
                Active Streak
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Flame className="h-5 w-5 text-[#f97316]" />
                <span className="font-headline text-lg sm:text-xl font-extrabold text-[#0c2340]">
                  3 Wins
                </span>
              </div>
            </div>

            {/* Socket.IO Gateway Latency */}
            <div className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Radio className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-xs font-bold text-[#0c2340]">
                  Socket.IO Gateway
                </span>
                <span className="font-mono text-[11px] font-semibold text-emerald-600">
                  34ms latency • Synced
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-Column Layout (8 Col Left / 4 Col Sidebar on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Active Tournament, Queue, Directory */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* 3. Active Tournament Spotlight & Opponent Pairing Card */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 shadow-[0_4px_20px_rgba(12,35,64,0.04)] flex flex-col gap-5">
            {/* Tournament Headline */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-headline text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Round Active ({tournament.status})
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#f97316] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                    ⚡ {tournament.timeControl} Rapid
                  </span>
                  <span className="font-mono text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[#ea580c]" />
                    Schedule: {formatTournamentSchedule(tournament.startDate || tournament.createdAt, tournament.endDate)}
                  </span>
                </div>
                <h2 className="font-headline text-2xl sm:text-3xl font-extrabold text-[#0c2340] tracking-tight">
                  {tournament.name}
                </h2>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-medium text-slate-400 font-headline">Field Size</div>
                  <div className="font-mono text-sm font-bold text-[#0c2340]">
                    {tournament.participants?.length || 0} Competitors
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                <span className="px-3.5 py-1.5 rounded-lg bg-[#0c2340] text-white font-mono text-xs font-bold tracking-wide shadow-sm">
                  Round Active
                </span>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Opponent Found Simulated Alert Banner (Stitch Spec) */}
            {matchedData && (
              <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#f97316] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Swords className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-headline text-base sm:text-lg font-bold text-[#0c2340]">
                          Opponent Found!
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold">
                          Pairing Confirmed
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                        Matched on live board • Playing as{' '}
                        <strong className="text-[#0c2340] font-bold capitalize">
                          {matchedData.side === 'w' ? 'White (♔)' : 'Black (♚)'}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-amber-700 bg-white px-3 py-2 rounded-lg border border-amber-200 shadow-2xs">
                      <Clock className="h-4 w-4 text-[#f97316] animate-spin" />
                      <span>0{countdown}s</span>
                    </div>
                    <Link
                      href={`/match/${matchedData.matchId}`}
                      className="koc-btn-primary px-5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2"
                    >
                      Enter Match Arena <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Matchmaking Radar & Live Telemetry Queue Box (Stitch Spec) */}
            {!matchedData && (
              <>
                {!isUserJoined ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-orange-50/50 border border-orange-200">
                    <div>
                      <h3 className="font-headline text-base sm:text-lg font-bold text-[#0c2340] flex items-center gap-2">
                        <Crown className="h-5 w-5 text-[#f97316]" />
                        Join this tournament to compete
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Register now to unlock automated FIFO matchmaking and earn points on the live leaderboard.
                      </p>
                    </div>
                    <button
                      onClick={() => joinMutation.mutate()}
                      disabled={joinMutation.isPending}
                      className="koc-btn-primary px-6 py-3 text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Register Now
                    </button>
                  </div>
                ) : isQueuing ? (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 sm:p-6 flex flex-col md:flex-row items-center gap-5 sm:gap-6 relative overflow-hidden">
                    {/* Sweeping Radar Animation Visual */}
                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-orange-500/10 animate-ping opacity-30" />
                      <div className="absolute w-28 h-28 rounded-full border border-slate-200 bg-white flex items-center justify-center shadow-2xs">
                        <div className="w-20 h-20 rounded-full border border-orange-200 bg-orange-50/50 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white shadow-2xs flex items-center justify-center text-[#f97316]">
                            <Radio className="h-6 w-6 text-[#f97316] animate-pulse" />
                          </div>
                        </div>
                      </div>
                      {/* Sweeping Radar Line SVG */}
                      <svg className="absolute inset-0 w-full h-full animate-radar-sweep" viewBox="0 0 160 160">
                        <defs>
                          <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M 80 80 L 160 80 A 80 80 0 0 0 80 0 Z" fill="url(#sweepGrad)" />
                      </svg>
                      {/* Animated Blip */}
                      <div className="absolute top-6 right-7 w-3 h-3 rounded-full bg-[#f97316] ring-4 ring-orange-200 animate-pulse" />
                    </div>

                    {/* Queue Status & Metrics */}
                    <div className="flex-1 w-full flex flex-col gap-2.5 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <span className="font-headline text-xs font-bold text-[#f97316] uppercase tracking-wider flex items-center justify-center md:justify-start gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#f97316] animate-ping" />
                            Live Queue Active
                          </span>
                          <h3 className="font-headline text-lg sm:text-xl font-extrabold text-[#0c2340]">
                            Searching for Opponent...
                          </h3>
                        </div>

                        {/* Elapsed & Est Wait */}
                        <div className="flex items-center justify-center md:justify-end gap-5">
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 font-headline uppercase">
                              Elapsed
                            </div>
                            <div className="font-mono text-base sm:text-lg font-bold text-[#0c2340]">
                              {formatTimer(queueElapsed)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 font-headline uppercase">
                              Est. Wait
                            </div>
                            <div className="font-mono text-base sm:text-lg font-bold text-[#f97316]">
                              ~00:35
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Constraints Pills */}
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-1">
                        <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[11px] font-medium shadow-2xs">
                          Band: ±150 Elo (1490 - 1790)
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[11px] font-medium shadow-2xs">
                          Colors: Balanced Random
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[11px] font-medium shadow-2xs">
                          Round Rule: 1 Game Limit
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[11px] font-medium shadow-2xs">
                          Queue: Strict FIFO
                        </span>
                      </div>

                      {/* Controls */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                        <button
                          onClick={handleCancelQueue}
                          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-headline font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <XCircle className="h-4 w-4" /> Cancel Queue
                        </button>
                        <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                          Pairing automatically in database transaction
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Registered Competitor
                      </div>
                      <h3 className="font-headline text-lg font-bold text-[#0c2340] mt-0.5">
                        Ready to Play Your Match?
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Click below to enter the automated matchmaking pool. You will be paired with the next available competitor.
                      </p>
                    </div>
                    <button
                      onClick={handleStartQueue}
                      className="koc-btn-primary px-6 py-3.5 text-sm font-bold flex items-center gap-2 shrink-0"
                    >
                      <Swords className="h-4 w-4" />
                      Find Opponent Now
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 5. Match Results & Standings Tabs Section */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 shadow-[0_4px_20px_rgba(12,35,64,0.04)] flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-headline text-lg sm:text-xl font-extrabold text-[#0c2340]">
                  Tournament Hub Navigation
                </h3>
                <p className="text-xs text-slate-500">Live standings, competitor tiebreaks, and match records</p>
              </div>

              {/* Tabs Switcher */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-headline transition ${
                    activeTab === 'leaderboard'
                      ? 'bg-white text-[#0c2340] shadow-sm'
                      : 'text-slate-500 hover:text-[#0c2340]'
                  }`}
                >
                  Standings ({leaderboardData?.leaderboard?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('matches')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-headline transition ${
                    activeTab === 'matches'
                      ? 'bg-white text-[#0c2340] shadow-sm'
                      : 'text-slate-500 hover:text-[#0c2340]'
                  }`}
                >
                  Matches ({tournament?.matches?.length || 0})
                </button>
              </div>
            </div>

            {activeTab === 'leaderboard' ? (
              <div className="flex flex-col gap-3">
                {/* Standings Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">Rank</th>
                        <th className="py-2.5 px-3">Competitor</th>
                        <th className="py-2.5 px-3 text-center">Score</th>
                        <th className="py-2.5 px-3 text-center">W / D / L</th>
                        <th className="py-2.5 px-3 text-center">Rounds</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaderboardData?.leaderboard?.map((entry) => (
                        <tr
                          key={entry.userId}
                          className={`transition hover:bg-slate-50 ${
                            entry.userId === user?.id
                              ? 'bg-orange-50/60 font-semibold text-[#0c2340] border-l-4 border-l-[#f97316]'
                              : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs font-bold text-slate-400">
                              #{entry.rank}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-[#0c2340] flex items-center gap-1.5">
                              <span>{entry.name}</span>
                              {entry.userId === user?.id && (
                                <span className="rounded-full bg-orange-100 border border-orange-200 px-1.5 py-0.2 text-[9px] font-bold text-[#f97316]">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate max-w-[160px]">
                              {entry.email}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono text-xs font-black text-[#f97316] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                              {entry.points} pts
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-xs">
                            <span className="text-emerald-600 font-bold">{entry.wins}W</span>{' '}
                            <span className="text-slate-400">/</span>{' '}
                            <span className="text-slate-500 font-bold">{entry.draws}D</span>{' '}
                            <span className="text-slate-400">/</span>{' '}
                            <span className="text-rose-500 font-bold">{entry.losses}L</span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-xs text-slate-500">
                            {entry.gamesPlayed}
                          </td>
                        </tr>
                      ))}

                      {(!leaderboardData?.leaderboard || leaderboardData.leaderboard.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                            No tournament participants registered yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Matches List */
              <div className="flex flex-col gap-3">
                {tournament?.matches && tournament.matches.length > 0 ? (
                  tournament.matches.map((match: any) => {
                    const isUserMatch =
                      match.whitePlayerId === user?.id || match.blackPlayerId === user?.id;

                    let scoreBadge = (
                      <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        Pending
                      </span>
                    );
                    if (match.status === 'active') {
                      scoreBadge = (
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live
                        </span>
                      );
                    } else if (match.result === 'white') {
                      scoreBadge = (
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          1 - 0
                        </span>
                      );
                    } else if (match.result === 'black') {
                      scoreBadge = (
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          0 - 1
                        </span>
                      );
                    } else if (match.result === 'draw') {
                      scoreBadge = (
                        <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          ½ - ½
                        </span>
                      );
                    }

                    return (
                      <div
                        key={match.id}
                        className={`p-3.5 sm:p-4 rounded-xl border transition ${
                          isUserMatch
                            ? 'border-[#f97316]/50 bg-orange-50/40 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                            Board #{match.id.slice(0, 4)}
                          </span>
                          {scoreBadge}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-800 text-[11px] font-bold">
                                ♔
                              </span>
                              <span className="font-bold text-[#0c2340]">
                                {match.whitePlayerName || 'White'}
                              </span>
                              {match.whitePlayerId === user?.id && (
                                <span className="text-[9px] text-[#f97316] font-bold">(You)</span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-slate-600">
                              {match.result === 'white' ? '1' : match.result === 'black' ? '0' : match.result === 'draw' ? '½' : '-'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded bg-[#0c2340] text-white text-[11px] font-bold">
                                ♚
                              </span>
                              <span className="font-bold text-[#0c2340]">
                                {match.blackPlayerName || 'Black'}
                              </span>
                              {match.blackPlayerId === user?.id && (
                                <span className="text-[9px] text-[#f97316] font-bold">(You)</span>
                              )}
                            </div>
                            <span className="font-mono font-bold text-slate-600">
                              {match.result === 'black' ? '1' : match.result === 'white' ? '0' : match.result === 'draw' ? '½' : '-'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-2">
                          <span className="text-[10px] text-slate-400 capitalize">
                            {match.status === 'active' ? 'In Progress' : match.terminationReason || 'Completed'}
                          </span>
                          <Link
                            href={`/match/${match.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-[#0c2340] hover:bg-[#f97316] hover:text-white hover:border-[#f97316] transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {match.status === 'active' ? 'Enter Live' : 'View Board'}
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No matches played in this tournament yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR: Standings & Pairings & History (Stitch Spec) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* 6. Top Standings Card */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-[0_4px_20px_rgba(12,35,64,0.04)]">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div>
                <span className="font-headline text-xs font-bold text-[#f97316] uppercase tracking-wider">
                  Top Leaderboard
                </span>
                <h3 className="font-headline text-base sm:text-lg font-extrabold text-[#0c2340]">
                  Live Standings
                </h3>
              </div>
              <Crown className="h-6 w-6 text-amber-500" />
            </div>

            <div className="flex flex-col gap-2 mt-3.5">
              {leaderboardData?.leaderboard?.slice(0, 5).map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-colors ${
                    entry.userId === user?.id
                      ? 'bg-orange-50 border-[#f97316]/50 shadow-xs'
                      : 'bg-slate-50 border-slate-100 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span
                      className={`font-mono font-bold text-xs sm:text-sm w-5 text-center ${
                        entry.rank === 1 ? 'text-[#f97316]' : 'text-slate-400'
                      }`}
                    >
                      #{entry.rank}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-headline text-xs sm:text-sm font-bold text-[#0c2340] truncate">
                        {entry.name}
                        {entry.userId === user?.id && (
                          <span className="text-[#f97316] ml-1">★</span>
                        )}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {entry.wins}W • {entry.draws}D • {entry.losses}L
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#0c2340] shrink-0">
                    {entry.points} pts
                  </span>
                </div>
              ))}

              {(!leaderboardData?.leaderboard || leaderboardData.leaderboard.length === 0) && (
                <div className="py-4 text-center text-xs text-slate-400">
                  No competitors yet.
                </div>
              )}
            </div>
          </div>

          {/* 7. Current Standings Ribbon Card (Mobile / Desktop Telemetry) */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-[0_4px_20px_rgba(12,35,64,0.04)] flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <Medal className="h-4 w-4 text-amber-500" />
                  <span className="font-headline text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                    Your Performance
                  </span>
                </div>
                <span className="font-headline font-bold text-sm text-[#0c2340] block mt-0.5">
                  Tournament Standing
                </span>
              </div>
              <div className="bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl text-right">
                <span className="font-headline font-bold text-[#f97316] text-base">
                  #{userRank}
                </span>
                <span className="text-[10px] text-slate-500 block font-medium">
                  of {tournament.participants?.length || 0}
                </span>
              </div>
            </div>

            {/* Quick Stats Pills */}
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-xl text-center">
                <span className="block font-headline font-bold text-base text-emerald-700">
                  {userWins}
                </span>
                <span className="block text-[11px] font-medium text-emerald-800">Wins</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-center">
                <span className="block font-headline font-bold text-base text-[#0c2340]">
                  {userDraws}
                </span>
                <span className="block text-[11px] font-medium text-slate-500">Draws</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-center">
                <span className="block font-headline font-bold text-base text-slate-400">
                  {userLosses}
                </span>
                <span className="block text-[11px] font-medium text-slate-500">Losses</span>
              </div>
            </div>

            {/* Telemetry Details */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Points: <strong className="text-[#f97316] font-bold">{userScore} pts</strong></span>
              <span>Clock: <strong className="text-[#0c2340] font-bold">{tournament.timeControl}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TournamentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#f97316]" />
        </div>
      }
    >
      <TournamentDetailContent />
    </Suspense>
  );
}
