'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Crown, AlertCircle, ArrowRight, Lock, Mail, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/tournaments';
  const { user, loading, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    setSubmitting(true);
    try {
      await login(email, password);
      router.push(redirectTarget);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
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
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="koc-card rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(12,35,64,0.06)] border border-slate-200 bg-white relative overflow-hidden">
          {/* Subtle top brand orange accent stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#0c2340]" />

          <div className="mb-6 sm:mb-8 text-center">
            <div className="mx-auto mb-3 sm:mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-orange-50 border border-orange-200 text-[#ea580c] shadow-sm">
              <Crown className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-[#0c2340]">
              Kingdom of Chess
            </h1>
            <p className="mt-1 text-xs text-slate-500 font-body">
              Sign in to enter the scholastic tournament arena
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-body">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 font-body">
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
                  placeholder="student@koc.com"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#0c2340] placeholder-slate-400 transition focus:border-[#ea580c] focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-headline">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#0c2340] placeholder-slate-400 transition focus:border-[#ea580c] focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="koc-btn-primary mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-50 font-headline"
            >
              {submitting ? 'Authenticating...' : 'Sign In to Account'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Switch to Sign Up */}
          <div className="mt-5 text-center border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-600 font-body">
              Don&apos;t have an account?{' '}
              <Link
                href={
                  redirectTarget !== '/tournaments'
                    ? `/signup?redirect=${encodeURIComponent(redirectTarget)}`
                    : '/signup'
                }
                className="font-bold text-[#ea580c] hover:underline font-headline"
              >
                Sign Up for free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#ea580c]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
