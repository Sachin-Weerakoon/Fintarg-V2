'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordField } from '@/components/ui/PasswordField';

export type WorkMode = 'salary' | 'business' | 'both';

interface AuthViewProps {
  initialMode?: 'signin' | 'signup';
}

const workModes: {
  value: WorkMode;
  title: string;
  badge: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'salary',
    title: 'Salary',
    badge: 'Job / Employment',
    description: 'Track pay slips, deductions & household burn',
    icon: '💼',
  },
  {
    value: 'business',
    title: 'Business',
    badge: 'Owner / Enterprise',
    description: 'Track daily sales, cash register & inventory costs',
    icon: '🏪',
  },
  {
    value: 'both',
    title: 'Both',
    badge: 'Job + Business',
    description: 'Dual income: manage both cashflows seamlessly',
    icon: '⚡',
  },
];

export function AuthView({ initialMode = 'signin' }: AuthViewProps) {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);
  const [workMode, setWorkMode] = useState<WorkMode>('salary');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (authMode === 'signup' && !form.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!form.password) {
      setError('Please enter your password.');
      return;
    }
    if (authMode === 'signup' && form.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: authMode,
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          workMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || (authMode === 'signup' ? 'Could not create account. Please try again.' : 'Invalid email or password.'));
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-[#070D19] via-[#0B1528] to-[#0F1D32] text-white selection:bg-primary-500/30">
      {/* Left Column: Value Prop & Branding */}
      <section className="hidden md:flex flex-col justify-between px-12 lg:px-16 py-12 flex-1 relative overflow-hidden">
        {/* Ambient atmospheric glow */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 rounded-full bg-primary-700/10 blur-3xl pointer-events-none" />

        {/* Top brand header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/10 p-2 shadow-lg border border-white/15 flex-shrink-0 backdrop-blur-md">
            <img src="/brand/fintarg-logo.svg" alt="Fintarg logo" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <div className="text-white font-extrabold text-xl tracking-tight flex items-center gap-2">
              <span>Fintarg</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full text-primary-400 bg-primary-400/15 border border-primary-400/30">
                v2.0
              </span>
            </div>
            <div className="text-xs text-slate-400 font-medium">Personal & Business Finance OS</div>
          </div>
        </div>

        {/* Hero headline & key highlights */}
        <div className="relative z-10 max-w-lg my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-400/10 border border-primary-400/20 text-primary-300 text-xs font-semibold mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            <span>Sri Lanka&apos;s Modern Financial OS</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight mb-4 text-white">
            Take total control <br />
            <span className="bg-gradient-to-r from-primary-400 via-primary-300 to-emerald-400 bg-clip-text text-transparent">
              of your month
            </span>
          </h1>

          <p className="text-slate-300 text-base leading-relaxed mb-8">
            Eliminate cashflow surprises. Track recurring burn, automate daily savings goals, and manage your complete wealth portfolio with confidence.
          </p>

          <ul className="space-y-3.5 text-sm text-slate-200">
            {[
              'Predict shortfalls and household burn rate before month end',
              'Set automated daily savings targets for every goal',
              'Dedicated salary pay slips and business cash register ledgers',
              'Secure document vault & automated legal letter generator',
            ].map(feature => (
              <li key={feature} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-primary-500/20 border border-primary-400/30 text-primary-300 flex-shrink-0 text-xs font-bold">
                  ✓
                </span>
                <span className="leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span>Built specifically for Sri Lankan currency & laws.</span>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-300">Bank-grade security</span>
            <span className="text-white/20">•</span>
            <a
              href="https://raxwo.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-primary-300 transition-colors"
            >
              Powered by <span className="font-bold text-primary-400">Raxwo (Pvt) Ltd</span>
            </a>
          </div>
        </div>
      </section>

      {/* Right Column: Form Container */}
      <section className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md lg:max-w-lg bg-[#0E1726]/95 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-white">
          {/* Card Mobile Brand Header */}
          <div className="flex md:hidden items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/10 p-1.5 border border-white/10">
                <img src="/brand/fintarg-logo.svg" alt="Fintarg logo" className="w-6 h-6 object-contain" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">Fintarg</span>
            </div>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded text-primary-300 bg-primary-500/15 border border-primary-400/30">
              v2.0
            </span>
          </div>

          {/* Quick Segmented Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#080E1A] border border-white/10 mb-6 text-sm font-semibold">
            <button
              type="button"
              id="tab-signin"
              onClick={() => {
                setAuthMode('signin');
                setError('');
              }}
              className={`py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                authMode === 'signin'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Sign In</span>
            </button>
            <button
              type="button"
              id="tab-signup"
              onClick={() => {
                setAuthMode('signup');
                setError('');
              }}
              className={`py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                authMode === 'signup'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Create Account</span>
            </button>
          </div>

          {/* Headings */}
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {authMode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-xs sm:text-sm mt-1 text-slate-400 leading-relaxed">
              {authMode === 'signin'
                ? 'Sign in to access your financial dashboard and ledger.'
                : 'Set up your account to start managing cashflow and goals.'}
            </p>
          </div>

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5" htmlFor="auth-name">
                  Full name
                </label>
                <Input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Kasun Perera"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="form-input-dark"
                  iconLeft={
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  }
                  required={authMode === 'signup'}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5" htmlFor="auth-email">
                Email address
              </label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                placeholder="kasun@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="form-input-dark"
                iconLeft={
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                }
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-200" htmlFor="auth-password">
                  Password
                </label>
                {authMode === 'signin' && (
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary-400 hover:text-primary-300 hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <PasswordField
                id="auth-password"
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                placeholder={authMode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="form-input-dark"
                iconLeft={
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                }
                required
              />
              {authMode === 'signup' && (
                <p className="text-[11px] text-slate-400 mt-1">Must contain at least 8 characters</p>
              )}
            </div>

            {/* Income Flow Selector for Sign Up */}
            {authMode === 'signup' && (
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Financial setup / Income flow
                </label>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Income flow">
                  {workModes.map(option => {
                    const isSelected = workMode === option.value;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setWorkMode(option.value)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-primary-500/15 border-primary-400 ring-1 ring-primary-400/40 text-white shadow-sm'
                            : 'bg-[#0A111E] border-white/10 hover:border-white/20 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-base">{option.icon}</span>
                          {isSelected && (
                            <span className="w-3.5 h-3.5 rounded-full bg-primary-500 text-white flex items-center justify-center text-[9px] font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-xs leading-tight">{option.title}</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">{option.badge}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div
                className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs mt-3 flex items-start gap-2.5"
                role="alert"
              >
                <span className="text-rose-400 font-bold text-sm leading-none mt-0.5">⚠</span>
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2 py-2.5 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-500 shadow-lg text-white"
              loading={submitting}
              disabled={submitting}
            >
              {authMode === 'signup' ? 'Create Account →' : 'Sign In'}
            </Button>
          </form>

          {/* Bottom Switcher Link */}
          <div className="text-center text-xs mt-5 text-slate-400">
            {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              className="font-semibold text-primary-400 hover:text-primary-300 hover:underline transition-colors ml-1 cursor-pointer"
              onClick={() => {
                setAuthMode(a => (a === 'signup' ? 'signin' : 'signup'));
                setError('');
              }}
            >
              {authMode === 'signup' ? 'Sign in' : 'Create account'}
            </button>
          </div>

          {/* Brand Credits */}
          <div className="text-center text-xs text-slate-500 mt-5 pt-4 border-t border-white/10 flex items-center justify-center gap-1.5">
            <span>Fintarg is a brand of</span>
            <a
              href="https://raxwo.net"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-400 hover:text-primary-300 hover:underline transition-colors"
            >
              Raxwo (Pvt) Ltd
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
