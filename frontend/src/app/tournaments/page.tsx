'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { Tournament } from '../../types';
import {
  Trophy,
  Plus,
  Users,
  Calendar,
  ArrowRight,
  Shield,
  Loader2,
  AlertCircle,
  Crown,
  Zap,
  Timer,
  CheckCircle2,
  Swords,
  Filter,
  X,
  Clock,
} from 'lucide-react';

export default function TournamentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTimeControl, setNewTimeControl] = useState('5+0');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'enrolled' | 'completed'>('all');
  const [joiningTournamentId, setJoiningTournamentId] = useState<string | null>(null);

  // Fetch tournaments
  const {
    data: tournaments,
    isLoading,
    error,
  } = useQuery<Tournament[]>({
    queryKey: ['tournaments'],
    queryFn: () => apiRequest<Tournament[]>('/tournaments'),
  });

  // Coach-specific tournaments list
  const coachTournaments = useMemo(() => {
    if (!tournaments || !user || user.role !== 'coach') return [];
    return tournaments.filter((t) => t.createdBy === user.id);
  }, [tournaments, user]);

  // Relevant tournaments: For coach, strictly only show tournaments created by this coach!
  const relevantTournaments = useMemo(() => {
    if (!tournaments) return [];
    if (user?.role === 'coach') {
      return tournaments.filter((t) => t.createdBy === user.id);
    }
    return tournaments;
  }, [tournaments, user]);

  // Filter tournaments by lifecycle status
  const filteredTournaments = useMemo(() => {
    if (!relevantTournaments) return [];
    if (filterStatus === 'all') return relevantTournaments;
    if (filterStatus === 'open') {
      return relevantTournaments.filter((t) => t.status === 'open' || t.status === 'ongoing');
    }
    if (filterStatus === 'enrolled') {
      return relevantTournaments.filter((t) => t.isJoined);
    }
    if (filterStatus === 'completed') {
      return relevantTournaments.filter((t) => t.status === 'completed');
    }
    return relevantTournaments;
  }, [relevantTournaments, filterStatus]);

  // Create Tournament mutation (Coach only)
  const createMutation = useMutation({
    mutationFn: async () => {
      const timeParts = newTimeControl.split('+');
      const minutes = parseInt(timeParts[0] || '5', 10);
      const inc = parseInt(timeParts[1] || '0', 10);
      return apiRequest('/tournaments', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          timeControl: newTimeControl,
          initialTimeSeconds: minutes * 60,
          incrementSeconds: inc,
          status: 'open',
          startDate: newStartDate ? new Date(newStartDate).toISOString() : new Date().toISOString(),
          endDate: newEndDate ? new Date(newEndDate).toISOString() : undefined,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      setShowCreateModal(false);
      setNewName('');
      setNewStartDate('');
      setNewEndDate('');
      setCreateError(null);
    },
    onError: (err: any) => {
      setCreateError(err.message || 'Failed to create tournament');
    },
  });

  // Delete Tournament mutation (Coach only)
  const deleteMutation = useMutation({
    mutationFn: (tournamentId: string) =>
      apiRequest(`/tournaments/${tournamentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to delete tournament');
    },
  });

  // Join Tournament mutation (Student only)
  const joinMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      setJoiningTournamentId(tournamentId);
      return apiRequest(`/tournaments/${tournamentId}/join`, { method: 'POST' });
    },
    onSuccess: (_, tournamentId) => {
      setJoiningTournamentId(null);
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      router.push(`/tournaments/${tournamentId}`);
    },
    onError: (err: any) => {
      setJoiningTournamentId(null);
      alert(err?.message || 'Failed to join tournament');
    },
  });

  // Helper to format Date into datetime-local string (YYYY-MM-DDTHH:mm)
  const toDatetimeLocal = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getPresetDate = (type: 'now' | 'tomorrow_eve' | 'weekend_sat' | 'weekend_sun') => {
    const d = new Date();
    if (type === 'now') {
      return toDatetimeLocal(d);
    }
    if (type === 'tomorrow_eve') {
      d.setDate(d.getDate() + 1);
      d.setHours(18, 0, 0, 0);
      return toDatetimeLocal(d);
    }
    if (type === 'weekend_sat') {
      const daysUntilSat = ((6 - d.getDay() + 7) % 7) || 7;
      d.setDate(d.getDate() + daysUntilSat);
      d.setHours(11, 0, 0, 0);
      return toDatetimeLocal(d);
    }
    if (type === 'weekend_sun') {
      const daysUntilSun = ((7 - d.getDay()) % 7) || 7;
      d.setDate(d.getDate() + daysUntilSun);
      d.setHours(16, 0, 0, 0);
      return toDatetimeLocal(d);
    }
    return toDatetimeLocal(d);
  };

  const getPresetEndDate = (hoursOffset: number) => {
    const base = newStartDate ? new Date(newStartDate) : new Date();
    base.setTime(base.getTime() + hoursOffset * 60 * 60 * 1000);
    return toDatetimeLocal(base);
  };

  // Platform-wide standard schedule formatting helper (DD/MM/YYYY per PRD specification)
  const formatTournamentSchedule = (startDateString?: string, endDateString?: string) => {
    if (!startDateString) return 'Season 2026';
    try {
      const start = new Date(startDateString);
      if (isNaN(start.getTime())) return 'Season 2026';

      const pad = (n: number) => n.toString().padStart(2, '0');
      const formatDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

      const formatTime = (d: Date) => {
        let h = d.getHours();
        const m = pad(d.getMinutes());
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${pad(h)}:${m} ${ampm}`;
      };

      if (!endDateString) {
        return `${formatDate(start)} • ${formatTime(start)}`;
      }

      const end = new Date(endDateString);
      if (isNaN(end.getTime())) {
        return `${formatDate(start)} • ${formatTime(start)}`;
      }

      const isSameDay =
        start.getFullYear() === end.getFullYear() &&
        start.getMonth() === end.getMonth() &&
        start.getDate() === end.getDate();

      if (isSameDay) {
        return `${formatDate(start)} • ${formatTime(start)} – ${formatTime(end)}`;
      }

      return `${formatDate(start)} – ${formatDate(end)}`;
    } catch {
      return 'Season 2026';
    }
  };

  // Deterministic clean date formatting helper (avoids hydration mismatches)
  const formatTournamentDate = (dateString?: string) => {
    return formatTournamentSchedule(dateString);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 font-headline">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Registration Open
          </span>
        );
      case 'ongoing':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#ea580c] font-headline">
            <span className="h-2 w-2 rounded-full bg-[#ea580c] animate-ping" />
            Live Round Active
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 font-headline">
            🏆 Event Concluded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 font-headline">
            Draft
          </span>
        );
    }
  };

  const totalRegisteredCompetitors = useMemo(() => {
    return coachTournaments.reduce((acc, t) => acc + (t.participantCount || 0), 0);
  }, [coachTournaments]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10 sm:px-6 lg:px-8 pb-24 md:pb-12">
      {/* COACH EXCLUSIVE: Director Command Center Banner */}
      {user?.role === 'coach' && (
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-[#0c2340] via-[#163a66] to-[#0c2340] p-6 sm:p-8 text-white shadow-lg border border-[#163a66] relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#ea580c]/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ea580c]/20 border border-[#ea580c]/40 px-3 py-1 text-xs font-bold text-orange-300 font-headline mb-3">
                <Shield className="h-3.5 w-3.5 text-[#ea580c]" />
                Tournament Director Mode • FIDE Arbiter Certified
              </div>
              <h2 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Coach Operations & Tournament Hub
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 font-body leading-relaxed">
                As an Academy Coach, you create and preside over tournaments. You can configure time controls, inspect registered student rosters, launch competitive rounds, and arbitrate live matches in real time.
              </p>

              {/* Director Quick Stats */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-white/10 backdrop-blur-xs p-3 border border-white/10">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 font-headline">
                    Total Arenas
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-white">
                    {coachTournaments.length}
                  </span>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-xs p-3 border border-white/10">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 font-headline">
                    Active Rounds
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">
                    {coachTournaments.filter((t) => t.status === 'open' || t.status === 'ongoing').length}
                  </span>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-xs p-3 border border-white/10">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 font-headline">
                    Total Competitors
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-orange-400">
                    {totalRegisteredCompetitors}
                  </span>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-xs p-3 border border-white/10">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 font-headline">
                    Arbiter Role
                  </span>
                  <span className="font-headline text-xs sm:text-sm font-bold text-white mt-1 block">
                    Chief Director
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                onClick={() => setShowCreateModal(true)}
                className="koc-btn-primary flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-xs sm:text-sm font-extrabold shadow-md font-headline"
              >
                <Plus className="h-4 w-4" />
                Host New Tournament
              </button>
              <Link
                href="/standings"
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 px-6 py-3 text-xs font-bold text-white transition font-headline"
              >
                <Trophy className="h-4 w-4 text-amber-400" />
                Circuit Standings
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Banner for Students & Visitors */}
      {user?.role !== 'coach' && (
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-slate-200 pb-6 sm:pb-8">
          <div>
            <div className="flex items-center gap-2 text-[#ea580c] mb-1">
              <Crown className="h-4 w-4" />
              <span className="text-xs font-extrabold uppercase tracking-widest font-headline">
                Kingdom of Chess League
              </span>
            </div>
            <h1 className="font-headline text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0c2340]">
              Tournament Arena Directory
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 font-body">
              Official scholastic tournaments with automated pairings, authoritative FIDE clocks, and live leaderboards.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/standings"
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-[#0c2340] transition font-headline shadow-2xs flex items-center gap-1.5"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              View Standings
            </Link>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition font-headline ${
              filterStatus === 'all'
                ? 'bg-[#0c2340] text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {user?.role === 'coach' ? 'My Hosted Events' : 'All Events'} ({relevantTournaments.length})
          </button>
          <button
            onClick={() => setFilterStatus('open')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition font-headline ${
              filterStatus === 'open'
                ? 'bg-[#ea580c] text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Open & Live ({relevantTournaments.filter((t) => t.status === 'open' || t.status === 'ongoing').length})
          </button>
          {user?.role === 'student' && (
            <button
              onClick={() => setFilterStatus('enrolled')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition font-headline flex items-center gap-1.5 ${
                filterStatus === 'enrolled'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Enrolled ({relevantTournaments.filter((t) => t.isJoined).length})
            </button>
          )}
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition font-headline ${
              filterStatus === 'completed'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Concluded ({relevantTournaments.filter((t) => t.status === 'completed').length})
          </button>
        </div>

        <span className="text-xs text-slate-500 font-mono font-medium">
          Showing {filteredTournaments.length} {user?.role === 'coach' ? 'hosted tournaments' : 'tournaments'}
        </span>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#ea580c]" />
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
          <p className="font-bold">Unable to load tournaments</p>
          <p className="text-xs text-red-600/80 mt-1">{(error as any).message}</p>
        </div>
      )}

      {/* Empty State */}
      {filteredTournaments.length === 0 && !isLoading && (
        <div className="koc-card rounded-3xl p-16 text-center border border-slate-200 bg-white shadow-xs">
          <Trophy className="mx-auto h-16 w-16 text-slate-300 mb-4" />
          <h3 className="font-headline text-xl font-bold text-[#0c2340]">
            {user?.role === 'coach'
              ? 'No hosted tournaments match this filter'
              : filterStatus === 'enrolled'
                ? 'You are not enrolled in any tournaments yet'
                : 'No tournaments match this filter'}
          </h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto font-body">
            {user?.role === 'coach'
              ? 'You haven\'t hosted any tournaments matching this filter. Click "Host New Tournament" above to start an event.'
              : filterStatus === 'enrolled'
                ? 'Browse open tournaments under "Open & Live" and click "Register Now" to participate.'
                : 'Switch filters or wait for a coach to host the next tournament round.'}
          </p>
        </div>
      )}

      {/* Tournament Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTournaments.map((t) => {
          const isCompleted = t.status === 'completed';
          const isEnrolled = t.isJoined && user?.role === 'student';
          return (
            <div
              key={t.id}
              className={`koc-card group flex flex-col justify-between rounded-2xl p-6 transition duration-200 hover:-translate-y-1 hover:shadow-md border bg-white relative overflow-hidden ${
                isEnrolled
                  ? 'border-emerald-300 ring-1 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200'
              }`}
            >
              {/* Top Accent Strip */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                isCompleted
                  ? 'from-purple-500 via-indigo-500 to-slate-400'
                  : isEnrolled
                    ? 'from-emerald-500 via-teal-400 to-[#0c2340]'
                    : 'from-[#ea580c] via-amber-400 to-[#0c2340]'
              }`} />

              {/* Top Row: Badge + Time Control */}
              <div>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(t.status)}
                    {isEnrolled && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold font-headline shadow-xs tracking-wider uppercase">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200 shrink-0" />
                        Enrolled
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1.5 rounded-lg bg-orange-50 border border-orange-200/80 px-2.5 py-1 text-xs font-mono font-bold text-[#ea580c] shrink-0">
                    <Timer className="h-3.5 w-3.5 text-[#ea580c]" />
                    {t.timeControl} Rapid
                  </span>
                </div>

                {/* Tournament Name */}
                <h3 className="font-headline text-xl font-extrabold text-[#0c2340] group-hover:text-[#ea580c] transition">
                  {t.name}
                </h3>

                <p className="text-xs text-slate-500 mt-1 font-body">
                  National Scholastic Grand Prix Circuit
                </p>

                {/* Proper Structured Data Row */}
                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs font-body">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Users className="h-3.5 w-3.5 text-emerald-600" />
                      Players:
                    </span>
                    <span className="font-bold text-[#0c2340] font-mono text-sm">
                      {t.participantCount || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-[#ea580c]" />
                      Schedule:
                    </span>
                    <span className="font-mono font-semibold text-slate-800 text-right">
                      {formatTournamentSchedule(t.startDate || t.createdAt, t.endDate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Shield className="h-3.5 w-3.5 text-amber-500" />
                      Rules:
                    </span>
                    <span className="font-semibold text-slate-700">
                      FIDE Authoritative Validation
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 flex items-center gap-2.5 border-t border-slate-100 pt-5">
                {user?.role === 'coach' ? (
                  <>
                    <Link
                      href={`/tournaments/${t.id}`}
                      className="flex-1 rounded-xl border border-orange-200 bg-orange-50 hover:bg-[#ea580c] hover:text-white px-4 py-2.5 text-center text-xs font-bold text-[#ea580c] transition font-headline flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Director Console
                    </Link>

                    <Link
                      href={`/standings?id=${t.id}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700 transition font-headline"
                      title="View Standings Table"
                    >
                      <Trophy className="h-4 w-4 text-amber-500" />
                    </Link>

                    {t.createdBy === user?.id && (t.status === 'open' || t.status === 'draft') && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete tournament "${t.name}"? This cannot be undone.`)) {
                            deleteMutation.mutate(t.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-2.5 text-xs font-bold text-rose-600 transition font-headline"
                        title="Delete Tournament"
                      >
                        ✕
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {t.isJoined ? (
                      <>
                        <Link
                          href={`/tournaments/${t.id}`}
                          className="koc-btn-primary flex-1 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-center text-xs font-bold font-headline shadow-2xs"
                        >
                          <Swords className="h-3.5 w-3.5" />
                          Enter Arena & Radar
                        </Link>

                        <Link
                          href={`/standings?id=${t.id}`}
                          className="rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3 py-2.5 text-xs font-bold text-amber-800 transition font-headline"
                          title="View Standings Table"
                        >
                          <Trophy className="h-4 w-4" />
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href={`/tournaments/${t.id}`}
                          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2.5 text-center text-xs font-bold text-[#0c2340] transition font-headline truncate"
                        >
                          View Details
                        </Link>

                        <Link
                          href={`/standings?id=${t.id}`}
                          className="rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3 py-2.5 text-xs font-bold text-amber-800 transition font-headline"
                          title="View Standings Table"
                        >
                          <Trophy className="h-4 w-4" />
                        </Link>

                        {(t.status === 'open' || t.status === 'ongoing') && (
                          <button
                            onClick={() => {
                              if (!user) {
                                router.push('/login?redirect=/tournaments');
                                return;
                              }
                              joinMutation.mutate(t.id);
                            }}
                            disabled={joiningTournamentId === t.id}
                            className="koc-btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold font-headline disabled:opacity-50"
                          >
                            {joiningTournamentId === t.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Joining...
                              </>
                            ) : (
                              <>
                                Join
                                <ArrowRight className="h-3.5 w-3.5" />
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Host Tournament Modal (Coach Only) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0c2340]/75 p-3 sm:p-4 md:p-6 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header: Fixed at top */}
            <div className="relative bg-gradient-to-r from-[#0c2340] via-[#14355a] to-[#0c2340] text-white p-5 sm:p-6 shrink-0 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ea580c] to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-orange-300 font-headline mb-1">
                      <Shield className="h-3 w-3 text-amber-400" />
                      FIDE Arbiter Console
                    </div>
                    <h2 className="font-headline text-lg sm:text-xl font-extrabold text-white tracking-tight">
                      Host New Scholastic Tournament
                    </h2>
                    <p className="text-xs text-slate-300 font-body">
                      Automated pairings, authoritative clocks & live leaderboards
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable in the middle */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 font-body">
              {createError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{createError}</span>
                </div>
              )}

              {/* 1. Tournament Name Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 font-headline flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-[#ea580c]" />
                    Tournament Title
                  </label>
                  <span className="text-[11px] font-medium text-slate-400 font-mono">
                    {newName.length}/60
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={60}
                    placeholder="e.g. Kingdom Autumn Grand Prix 2026"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-[#0c2340] placeholder-slate-400 focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/20 focus:outline-none transition shadow-2xs font-medium"
                  />
                </div>

                {/* Quick suggestions */}
                <div className="pt-1">
                  <span className="text-[11px] text-slate-500 font-medium block mb-1.5">
                    Recommended Academy Titles:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Friday Scholastic Arena',
                      'Kingdom Youth Rapid Cup',
                      'Grand Prix Blitz Arena',
                      'Sunday Grandmaster Open',
                    ].map((presetName) => (
                      <button
                        key={presetName}
                        type="button"
                        onClick={() => setNewName(presetName)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-medium transition border ${
                          newName === presetName
                            ? 'bg-orange-50 border-orange-300 text-[#ea580c] font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-200 hover:text-[#ea580c]'
                        }`}
                      >
                        + {presetName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Time Control Format Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 font-headline flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-[#ea580c]" />
                  Time Control Format
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      format: '3+0',
                      label: '3+0 Blitz',
                      category: '⚡ Blitz',
                      desc: '3 min flat • High-velocity dynamic games',
                    },
                    {
                      format: '5+0',
                      label: '5+0 Rapid',
                      category: '⏱️ Rapid (Standard)',
                      desc: '5 min flat • Recommended for academy events',
                    },
                    {
                      format: '10+0',
                      label: '10+0 Classical',
                      category: '⏳ Classical',
                      desc: '10 min flat • Deep positional calculations',
                    },
                    {
                      format: '15+10',
                      label: '15+10 Swiss',
                      category: '♟️ Swiss FIDE',
                      desc: '15 min + 10s increment • Official circuit standard',
                    },
                  ].map((item) => {
                    const isSelected = newTimeControl === item.format;
                    return (
                      <button
                        key={item.format}
                        type="button"
                        onClick={() => setNewTimeControl(item.format)}
                        className={`p-3.5 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#ea580c] bg-orange-50/60 ring-2 ring-[#ea580c]/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-headline font-bold text-sm text-[#0c2340]">
                            {item.label}
                          </span>
                          {isSelected ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ea580c] text-white">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="h-4 w-4 rounded-full border border-slate-300" />
                          )}
                        </div>
                        <div className="text-[11px] font-semibold text-[#ea580c] mb-1">
                          {item.category}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight">
                          {item.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Start & End Date Scheduling */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 font-headline flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#ea580c]" />
                    Event Schedule (Start & Optional End Date)
                  </label>
                  {(newStartDate || newEndDate) && (
                    <span className="text-[11px] font-mono text-[#ea580c] font-bold bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200">
                      {formatTournamentSchedule(newStartDate, newEndDate)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Start Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 font-headline">
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-[#0c2340] focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/20 focus:outline-none transition shadow-2xs font-mono font-medium"
                    />
                  </div>

                  {/* End Date (Optional) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-600 font-headline">
                        End Date & Time <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      {newEndDate && (
                        <button
                          type="button"
                          onClick={() => setNewEndDate('')}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold"
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="datetime-local"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-[#0c2340] focus:border-[#ea580c] focus:ring-2 focus:ring-[#ea580c]/20 focus:outline-none transition shadow-2xs font-mono font-medium"
                    />
                  </div>
                </div>

                {/* Quick Date Presets */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Quick Start Presets:
                    </span>
                    {newStartDate && (
                      <span className="text-[11px] text-[#ea580c] font-semibold">
                        Add Duration:
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNewStartDate(getPresetDate('now'))}
                        className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-200 hover:text-[#ea580c] border border-slate-200 text-xs font-medium text-slate-700 transition"
                      >
                        ⚡ Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewStartDate(getPresetDate('tomorrow_eve'))}
                        className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-200 hover:text-[#ea580c] border border-slate-200 text-xs font-medium text-slate-700 transition"
                      >
                        🌅 Tomorrow 6 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewStartDate(getPresetDate('weekend_sat'))}
                        className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-200 hover:text-[#ea580c] border border-slate-200 text-xs font-medium text-slate-700 transition"
                      >
                        🏆 Saturday 11 AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewStartDate(getPresetDate('weekend_sun'))}
                        className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-200 hover:text-[#ea580c] border border-slate-200 text-xs font-medium text-slate-700 transition"
                      >
                        👑 Sunday 4 PM
                      </button>
                    </div>

                    {newStartDate && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNewEndDate(getPresetEndDate(2))}
                          className="px-2 py-0.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[11px] font-semibold text-[#ea580c] transition"
                        >
                          +2 Hours
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewEndDate(getPresetEndDate(24))}
                          className="px-2 py-0.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[11px] font-semibold text-[#ea580c] transition"
                        >
                          +1 Day
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewEndDate(getPresetEndDate(48))}
                          className="px-2 py-0.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[11px] font-semibold text-[#ea580c] transition"
                        >
                          +2 Days
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Arbiter Governance & Rules Notice */}
              <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-orange-50/30 border border-slate-200 p-4 text-xs text-slate-600 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <span className="font-bold font-headline text-[#0c2340] block">
                    FIDE Standard Tournament Regulations
                  </span>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Once published, registered students will see the scheduled time. When competitors assemble, click &ldquo;Launch Tournament Round&rdquo; in the Director Console to start live clocks and pairings.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer: Sticky at bottom */}
            <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 backdrop-blur-xs p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="font-semibold text-slate-700">Selected:</span>
                <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-[#ea580c] font-bold">
                  {newTimeControl}
                </span>
                {newStartDate ? (
                  <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Scheduled
                  </span>
                ) : (
                  <span className="text-slate-400 text-[11px]">Immediate launch</span>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 font-headline transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !newName.trim()}
                  className="koc-btn-primary rounded-xl px-6 py-2.5 text-xs font-bold font-headline disabled:opacity-50 flex items-center gap-2 shadow-sm transition hover:shadow-md"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing Arena...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Launch Tournament
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
