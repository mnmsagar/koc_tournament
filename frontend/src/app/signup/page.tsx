'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  Crown,
  User,
  Mail,
  Lock,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/tournaments';
  const { user, loading, register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'coach'>('student');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTarget);
    }
  }, [user, loading, router, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password, role);
      router.push(redirectTarget);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#ea580c]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4 py-12 pb-24 md:pb-12">
      <div className="w-full max-w-lg">
        {/* Signup Card */}
        <div className="koc-card rounded-3xl p-6 sm:p-9 shadow-[0_8px_30px_rgba(12,35,64,0.06)] border border-slate-200 bg-white relative overflow-hidden">
          {/* Subtle top brand orange accent stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#0c2340]" />

          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-3.5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200 text-[#ea580c] shadow-sm">
              <Crown className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0c2340]">
              Create Your Account
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-body">
              Join the Kingdom of Chess scholastic league and compete in live rounds
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-body">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 font-body">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-headline">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Viswanathan Anand"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#0c2340] placeholder-slate-400 transition focus:border-[#ea580c] focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-headline">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@koc.com"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#0c2340] placeholder-slate-400 transition focus:border-[#ea580c] focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-headline">
                Password (min. 6 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#0c2340] placeholder-slate-400 transition focus:border-[#ea580c] focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-headline">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#0c2340] placeholder-slate-400 transition focus:border-[#ea580c] focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2 font-headline">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all ${
                    role === 'student'
                      ? 'border-[#ea580c] bg-orange-50/70 text-[#ea580c] shadow-xs ring-1 ring-[#ea580c]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <GraduationCap className={`h-6 w-6 mb-1 ${role === 'student' ? 'text-[#ea580c]' : 'text-slate-400'}`} />
                  <span className="font-headline font-bold text-xs">Student Competitor</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Play & Queue for Matches</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('coach')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all ${
                    role === 'coach'
                      ? 'border-[#0c2340] bg-slate-100 text-[#0c2340] shadow-xs ring-1 ring-[#0c2340]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className={`h-6 w-6 mb-1 ${role === 'coach' ? 'text-[#0c2340]' : 'text-slate-400'}`} />
                  <span className="font-headline font-bold text-xs">Coach / Organizer</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Host & Manage Tournaments</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="koc-btn-primary mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold disabled:opacity-50 font-headline"
            >
              {submitting ? 'Creating Account...' : 'Complete Sign Up & Enter Arena'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Switch to Sign In */}
          <div className="mt-7 text-center border-t border-slate-100 pt-5">
            <p className="text-xs text-slate-600 font-body">
              Already have an account?{' '}
              <Link
                href={
                  redirectTarget !== '/tournaments'
                    ? `/login?redirect=${encodeURIComponent(redirectTarget)}`
                    : '/login'
                }
                className="font-bold text-[#ea580c] hover:underline font-headline"
              >
                Sign In here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#ea580c]" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
