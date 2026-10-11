'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { UserStats } from '../types';
import {
  Trophy,
  LogOut,
  User as UserIcon,
  Swords,
  Medal,
  Bell,
} from 'lucide-react';

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const { data: stats } = useQuery<UserStats>({
    queryKey: ['user-stats'],
    queryFn: () => apiRequest<UserStats>('/me/stats'),
    enabled: !!user,
  });

  const isCoach = user?.role === 'coach';

  const ratingLabel = useMemo(() => {
    if (!user) return '';
    if (isCoach) return 'Coach (Director)';
    if (stats && stats.role === 'student') {
      return `${stats.rating} Blitz Elo`;
    }
    return 'Scholastic Player';
  }, [user, isCoach, stats]);

  const initials = useMemo(() => {
    if (!user?.name) return 'KC';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user?.name]);

  const avatarSrc = useMemo(() => {
    if (isCoach) return '/avatars/coach.png';
    const lower = user?.name?.toLowerCase() || '';
    if (lower.includes('alex')) return '/avatars/alex.png';
    if (lower.includes('marcus')) return '/avatars/marcus.png';
    return null;
  }, [isCoach, user?.name]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => pathname === path || (path !== '/' && pathname.startsWith(path + '/'));

  return (
    <>
      {/* 1. Header Navigation Bar (Crisp White with Kingdom of Chess Logo) */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-[0_2px_12px_rgba(12,35,64,0.04)]">
        <div className="max-w-[1440px] mx-auto h-16 sm:h-20 px-3 sm:px-6 md:px-8 flex items-center justify-between gap-3">
          {/* Logo & Student Arena Badge */}
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
              <img
                src="/koc_logo.png"
                alt="Kingdom of Chess"
                className="h-8 sm:h-11 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              />
              <div className="flex flex-col text-left">
                <span className="font-headline font-black text-xs sm:text-sm tracking-wider text-[#0c2340] uppercase leading-none">
                  Arena
                </span>
                <span className="text-[10px] text-slate-500 font-medium font-body leading-tight hidden xs:inline">
                  Student Hub
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1.5 font-headline">
              <Link
                href="/tournaments"
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  isActive('/tournaments')
                    ? 'bg-[#f97316] text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-[#0c2340] hover:bg-slate-100/80 font-medium'
                }`}
              >
                Tournaments
              </Link>

              <Link
                href="/match"
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  isActive('/match')
                    ? 'bg-[#f97316] text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-[#0c2340] hover:bg-slate-100/80 font-medium'
                }`}
              >
                Active Match
              </Link>

              <Link
                href="/standings"
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  isActive('/standings')
                    ? 'bg-[#f97316] text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-[#0c2340] hover:bg-slate-100/80 font-medium'
                }`}
              >
                Standings
              </Link>

              {user && (
                <Link
                  href="/account"
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    isActive('/account')
                      ? 'bg-[#f97316] text-white shadow-sm font-bold'
                      : 'text-slate-600 hover:text-[#0c2340] hover:bg-slate-100/80 font-medium'
                  }`}
                >
                  Account
                </Link>
              )}
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell (Desktop) */}
            <button
              aria-label="Notifications"
              className="hidden sm:flex relative p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#0c2340] transition-colors shadow-2xs"
              type="button"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#f97316] ring-2 ring-white" />
            </button>

            {/* User Profile / Auth State */}
            {!mounted || loading ? (
              <div className="h-9 w-24 animate-pulse rounded-full bg-slate-100" />
            ) : user ? (
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                {/* User Profile Pill -> links directly to /account */}
                <Link
                  href="/account"
                  className="flex items-center gap-2 sm:gap-2.5 pl-1.5 pr-2.5 sm:pr-4 py-1 rounded-full bg-white border border-slate-200 shadow-2xs hover:border-[#ea580c] hover:shadow-xs transition-all group"
                  title="View Account Profile"
                >
                  {avatarSrc ? (
                    <img
                      alt={user.name}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-[#f97316]/30 group-hover:ring-[#f97316] transition-colors"
                      src={avatarSrc}
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#0c2340] to-slate-800 text-amber-300 font-headline font-black text-[10px] sm:text-xs flex items-center justify-center ring-2 ring-[#f97316]/30 group-hover:ring-[#f97316] transition-colors shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <span className="font-headline font-bold text-xs text-[#0c2340] group-hover:text-[#ea580c] leading-tight truncate max-w-[80px] xs:max-w-[120px] sm:max-w-none transition-colors">
                      {user.name}
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-[#f97316] leading-none">
                      {ratingLabel}
                    </span>
                  </div>
                </Link>

                {/* Logout Button (Directly Accessible on Desktop & Mobile) */}
                <button
                  onClick={() => logout()}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 shadow-2xs shrink-0"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-[#0c2340] transition font-headline"
                >
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/signup"
                  className="koc-btn-primary flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold font-headline"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Stitch Specification) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg md:hidden">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
          <Link
            href="/tournaments"
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] transition-colors ${
              isActive('/tournaments') ? 'text-[#f97316]' : 'text-slate-500 hover:text-[#0c2340]'
            }`}
          >
            <Trophy className="h-5 w-5" />
            <span className="font-headline font-bold text-[10px]">Tournaments</span>
          </Link>

          <Link
            href="/match"
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] relative transition-colors ${
              isActive('/match') ? 'text-[#f97316]' : 'text-slate-500 hover:text-[#0c2340]'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Swords className="h-5 w-5" />
              <span className="absolute -top-1 -right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f97316]" />
              </span>
            </div>
            <span className="font-headline font-semibold text-[10px]">Match</span>
          </Link>

          <Link
            href="/standings"
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] transition-colors ${
              isActive('/standings') ? 'text-[#f97316]' : 'text-slate-500 hover:text-[#0c2340]'
            }`}
          >
            <Medal className="h-5 w-5" />
            <span className="font-headline font-semibold text-[10px]">Rankings</span>
          </Link>

          <Link
            href={user ? '/account' : '/login'}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] transition-colors ${
              isActive('/account') || isActive('/login') || isActive('/signup') ? 'text-[#f97316]' : 'text-slate-500 hover:text-[#0c2340]'
            }`}
          >
            <UserIcon className="h-5 w-5" />
            <span className="font-headline font-semibold text-[10px]">
              {user ? 'Account' : 'Sign In'}
            </span>
          </Link>
        </div>
      </nav>
    </>
  );
}
