'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';
import { UserStats, CoachStats, StudentStats } from '../../types';
import {
  Crown,
  Trophy,
  Swords,
  Mail,
  ArrowRight,
  Flame,
  CheckCircle2,
  Medal,
  Activity,
  Sparkles,
  Users,
  Clock,
  Play,
  Award,
} from 'lucide-react';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Fetch 100% dynamic user stats from backend
  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['user-stats'],
    queryFn: () => apiRequest<UserStats>('/me/stats'),
    enabled: !!user,
  });

  const isCoach = user?.role === 'coach';
  const coachStats = isCoach ? (stats as CoachStats | undefined) : undefined;
  const studentStats = !isCoach ? (stats as StudentStats | undefined) : undefined;
  const studentId = user ? `KC-${user.id.slice(0, 8).toUpperCase()}` : '';

  // Format member since date
  const memberSinceFormatted = React.useMemo(() => {
    const rawDate = stats?.user?.createdAt || user?.createdAt;
    if (!rawDate) return 'Active Member';
    try {
      const d = new Date(rawDate);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Active Member';
    }
  }, [stats?.user?.createdAt, user?.createdAt]);

  // Initials for avatar
  const initials = React.useMemo(() => {
    if (!user?.name) return 'KC';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user?.name]);

  // Fallback avatar image check
  const avatarSrc = React.useMemo(() => {
    if (isCoach) return '/avatars/coach.png';
    const lower = user?.name?.toLowerCase() || '';
    if (lower.includes('alex')) return '/avatars/alex.png';
    if (lower.includes('marcus')) return '/avatars/marcus.png';
    return null;
  }, [isCoach, user?.name]);

  // Redirect guard: if user is not logged in, redirect them to /login
  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user || statsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-[#ea580c]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10 pb-24 md:pb-12">
      {/* Top Breadcrumb / Title */}
      <div className="mb-6 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-[#ea580c] mb-1">
          <Crown className="h-4 w-4" />
          <span className="text-xs font-extrabold uppercase tracking-widest font-headline">
            Kingdom of Chess Profile
          </span>
        </div>
        <h1 className="font-headline text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0c2340]">
          Account & Player Hub
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 font-body">
          Personal ratings, match statistics, and tournament history across the academy league.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column: User Identity Card (5 cols) */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="koc-card rounded-3xl p-6 sm:p-7 border border-slate-200 bg-white shadow-sm relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ea580c] via-amber-400 to-[#0c2340]" />

            {/* Profile Avatar & Name */}
            <div className="flex flex-col items-center text-center pt-2">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#0c2340] to-slate-800 border-2 border-orange-200 overflow-hidden shadow-md flex items-center justify-center text-white">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-headline text-2xl font-black text-amber-300 tracking-wider">
                        {initials}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mt-0.5">
                        {user.role}
                      </span>
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-emerald-200">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                </span>
              </div>

              <h2 className="font-headline text-xl sm:text-2xl font-black text-[#0c2340]">
                {user.name}
              </h2>

              <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {user.email}
              </p>

              {/* Title Badges */}
              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold font-headline flex items-center gap-1.5 shadow-2xs">
                  <Crown className="h-3.5 w-3.5 text-amber-600" />
                  {stats?.title || (isCoach ? 'Tournament Director & Arbiter' : 'Scholastic Candidate')}
                </span>
                <span className="px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#ea580c] text-xs font-bold font-headline uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>

            {/* Scholastic / Director Telemetry Grid */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
              {isCoach ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                      Arbiter Status
                    </span>
                    <span className="font-mono text-xl font-black text-[#ea580c]">
                      Certified
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">
                      FIDE Fair-Play
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                      Events Hosted
                    </span>
                    <span className="font-mono text-xl font-black text-[#0c2340] flex items-center justify-center gap-1">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      {coachStats?.tournamentsHosted ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                      {coachStats?.completedEvents ?? 0} Concluded
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                      Blitz Rating
                    </span>
                    <span className="font-mono text-xl font-black text-[#ea580c]">
                      {studentStats?.rating ?? 1200}
                    </span>
                    <span
                      className={`text-[10px] font-bold block mt-0.5 ${
                        (studentStats?.ratingNet ?? 0) > 0
                          ? 'text-emerald-600'
                          : (studentStats?.ratingNet ?? 0) < 0
                            ? 'text-red-500'
                            : 'text-slate-400'
                      }`}
                    >
                      {studentStats?.completedGames
                        ? (studentStats.ratingNet > 0
                            ? `+${studentStats.ratingNet} pts`
                            : `${studentStats.ratingNet} pts`)
                        : 'Provisional'}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                      Active Streak
                    </span>
                    <span className="font-mono text-xl font-black text-[#0c2340] flex items-center justify-center gap-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      {studentStats?.streak
                        ? `${studentStats.streak} Win${studentStats.streak > 1 ? 's' : ''}`
                        : '0 Wins'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                      {(studentStats?.streak ?? 0) >= 3
                        ? 'Hot Streak 🔥'
                        : (studentStats?.streak ?? 0) > 0
                          ? 'Active Run'
                          : studentStats?.completedGames
                            ? 'Streak Reset'
                            : 'Ready to Play'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Official Credentials Box */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs font-body">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Player License ID:</span>
                <span className="font-mono font-bold text-[#0c2340]">{studentId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Academy League:</span>
                <span className="font-bold text-[#ea580c]">Kingdom of Chess</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Member Since:</span>
                <span className="font-medium text-[#0c2340]">{memberSinceFormatted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">FIDE Fair-Play:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 100% Authoritative
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Performance Telemetry & Tournaments (7 cols) */}
        <div className="md:col-span-7 flex flex-col gap-6">
          {/* Performance Overview */}
          <div className="koc-card rounded-3xl p-6 sm:p-7 border border-slate-200 bg-white shadow-sm">
            <h3 className="font-headline text-lg font-bold text-[#0c2340] flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-[#ea580c]" />
              {isCoach ? 'Tournament Director Oversight' : 'Tournament Performance Summary'}
            </h3>

            {isCoach ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                    Tournaments Hosted
                  </span>
                  <span className="font-mono text-2xl font-black text-[#0c2340]">
                    {coachStats?.tournamentsHosted ?? 0}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                    Active Events
                  </span>
                  <span className="font-mono text-2xl font-black text-emerald-600">
                    {coachStats?.activeEvents ?? 0}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                    Concluded Events
                  </span>
                  <span className="font-mono text-2xl font-black text-amber-600">
                    {coachStats?.completedEvents ?? 0}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                    Students Enrolled
                  </span>
                  <span className="font-mono text-2xl font-black text-[#ea580c]">
                    {coachStats?.totalParticipants ?? 0}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                    Tournaments
                  </span>
                  <span className="font-mono text-2xl font-black text-[#0c2340]">
                    {studentStats?.tournamentsJoined ?? 0}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                    Wins
                  </span>
                  <span className="font-mono text-2xl font-black text-emerald-600">
                    {studentStats?.wins ?? 0}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                    Draws
                  </span>
                  <span className="font-mono text-2xl font-black text-amber-600">
                    {studentStats?.draws ?? 0}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-headline">
                    Losses
                  </span>
                  <span className="font-mono text-2xl font-black text-slate-500">
                    {studentStats?.losses ?? 0}
                  </span>
                </div>
              </div>
            )}

            {/* Additional Telemetry Bar */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-body">
              {isCoach ? (
                <>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>Total Matches Overseen:</span>
                    <strong className="font-mono text-[#0c2340]">
                      {coachStats?.totalMatches ?? 0}
                    </strong>
                  </div>
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Arbiter Active
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-slate-400" />
                    <span>Total Matches Played:</span>
                    <strong className="font-mono text-[#0c2340]">
                      {studentStats?.totalGames ?? 0}
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Win Rate:</span>
                    <strong className="font-mono text-[#ea580c]">
                      {studentStats?.winRate ?? 0}%
                    </strong>
                  </div>
                </>
              )}
            </div>

            {/* Dynamic Action Box */}
            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-headline font-bold text-xs text-[#0c2340] block">
                  {isCoach ? 'Tournament Director Console' : 'Automated FIFO Matchmaking Status'}
                </span>
                <span className="text-[11px] text-slate-600 mt-0.5 block font-body">
                  {isCoach
                    ? 'Create scholastic events, set time controls, and supervise live rounds.'
                    : `Current rating ${studentStats?.rating ?? 1200}. Eligible for rapid rounds with ±150 rating bandwidth.`}
                </span>
              </div>
              <Link
                href="/tournaments"
                className="koc-btn-primary flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold font-headline shrink-0"
              >
                {isCoach ? (
                  <>
                    <Crown className="h-3.5 w-3.5" />
                    Manage Events
                  </>
                ) : (
                  <>
                    <Swords className="h-3.5 w-3.5" />
                    Play Round
                  </>
                )}
              </Link>
            </div>
          </div>

          {/* Dynamic Recent Events / Participations Card */}
          <div className="koc-card rounded-3xl p-6 sm:p-7 border border-slate-200 bg-white shadow-sm">
            <h3 className="font-headline text-lg font-bold text-[#0c2340] flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-[#ea580c]" />
              {isCoach ? 'Recently Hosted Tournaments' : 'Recent Tournament Records'}
            </h3>

            {isCoach ? (
              coachStats?.recentTournaments && coachStats.recentTournaments.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {coachStats.recentTournaments.map((t) => (
                    <div key={t.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/tournaments/${t.id}`}
                          className="font-headline text-xs font-bold text-[#0c2340] hover:text-[#ea580c] transition truncate block"
                        >
                          {t.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-body">
                          <span className="font-mono">{t.timeControl}</span>
                          <span>•</span>
                          <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-headline ${
                            t.status === 'open'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : t.status === 'ongoing'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {t.status}
                        </span>
                        <Link
                          href={`/tournaments/${t.id}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-[#0c2340] hover:bg-slate-100 transition"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs font-body">
                  <p>No tournaments created yet.</p>
                  <Link
                    href="/tournaments"
                    className="inline-block mt-2 text-[#ea580c] font-bold font-headline hover:underline"
                  >
                    Host your first tournament &rarr;
                  </Link>
                </div>
              )
            ) : (
              studentStats?.recentParticipations && studentStats.recentParticipations.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {studentStats.recentParticipations.map((p) => (
                    <div key={p.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/tournaments/${p.tournamentId}`}
                          className="font-headline text-xs font-bold text-[#0c2340] hover:text-[#ea580c] transition truncate block"
                        >
                          {p.tournamentName}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-body">
                          <span className="font-mono">{p.timeControl}</span>
                          <span>•</span>
                          <span>Joined {new Date(p.joinedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-mono text-xs font-black text-[#ea580c] block">
                            {p.score} pts
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-headline">
                            {p.tournamentStatus}
                          </span>
                        </div>
                        <Link
                          href={`/tournaments/${p.tournamentId}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-[#0c2340] hover:bg-slate-100 transition"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs font-body">
                  <p>No tournament records yet.</p>
                  <Link
                    href="/tournaments"
                    className="inline-block mt-2 text-[#ea580c] font-bold font-headline hover:underline"
                  >
                    Explore open tournaments &rarr;
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
