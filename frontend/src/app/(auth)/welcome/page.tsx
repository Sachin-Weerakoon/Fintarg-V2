'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordField } from '@/components/ui/PasswordField';

type WorkMode = 'salary' | 'business' | 'both';

const workModeOptions: {
  value: WorkMode;
  title: string;
  description: string;
  features: string[];
  button: string;
}[] = [
  {
    value: 'salary',
    title: 'Salary earner',
    description: 'Track pay slip deductions, manage household expenses, and build an emergency fund.',
    features: ['Pay slip breakdowns', 'Household burn rate', 'Goal progress'],
    button: 'Use salary flow',
  },
  {
    value: 'business',
    title: 'Business owner',
    description: 'Run shop branches, track daily sales, and log inventory costs.',
    features: ['Multi-branch revenue', 'Cost tracking', 'Owner targets'],
    button: 'Use business flow',
  },
  {
    value: 'both',
    title: 'Salary + Business',
    description: 'Manage both a day job and side business cashflows seamlessly in one place.',
    features: ['Combined overview', 'Separate ledgers', 'Full reporting'],
    button: 'Use combined flow',
  },
];

export default function Welcome() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [signupStep, setSignupStep] = useState<'mode' | 'credentials'>('mode');
  const [workMode, setWorkMode] = useState<WorkMode>('salary');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const chooseWorkMode = (mode: WorkMode) => {
    setWorkMode(mode);
    setSignupStep('credentials');
    setError('');
  };

  const continueToApp = async () => {
    if (submitting) return;
    setError('');
    if (authMode === 'signup' && !form.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!form.email || !form.password) {
      setError('Please provide your email and password.');
      return;
    }
    if (authMode === 'signup' && form.password.length < 8) {
      setError('Password must be at least 8 characters.');
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
          email: form.email,
          password: form.password,
          workMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || (authMode === 'signup' ? 'Could not create account.' : 'Invalid email or password.'));
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'linear-gradient(135deg, var(--color-chrome-900) 0%, var(--color-chrome-800) 100%)' }}
    >
      <section className="hidden md:flex flex-col justify-between px-16 py-12 flex-1 relative overflow-hidden text-white">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 rounded-full bg-primary-700/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 p-1.5 shadow-lg border border-white/10 flex-shrink-0">
            <img src="/brand/fintarg-logo.svg" alt="Fintarg logo" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <div className="text-white font-extrabold text-xl tracking-tight flex items-center gap-2">
              <span>Fintarg</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded text-primary-400 bg-primary-tint/20 border border-primary-400/30">
                v2.0
              </span>
            </div>
            <div className="text-xs text-chrome-text font-medium">Personal & Business Finance</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-tint/10 border border-primary-500/20 text-primary-400 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
            <span>Sri Lanka&apos;s Modern Financial OS</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight mb-4 text-white">
            Take total control <br />
            <span className="bg-gradient-to-r from-primary-400 via-primary-300 to-success-solid bg-clip-text text-transparent">
              of your month
            </span>
          </h1>
          <p className="text-chrome-text text-base leading-relaxed">
            Eliminate cashflow surprises. Track recurring burn, automate daily savings goals, and manage your complete wealth portfolio.
          </p>
          <ul className="mt-8 space-y-3.5 text-sm text-white/90">
            {[
              'Predict shortfalls and burn rate before month end',
              'Set automated daily savings targets for every goal',
              'Secure document vault & automated legal letter generator',
            ].map(feature => (
              <li key={feature} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-primary-tint/20 text-primary-400 flex-shrink-0 text-xs font-bold">
                  ✓
                </span>
                <span className="leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-chrome-text">
          <span>Built specifically for Sri Lankan currency & laws.</span>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white/90">Bank-grade security</span>
            <span className="text-white/30">•</span>
            <a
              href="https://raxwo.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-primary-300 transition-colors"
            >
              Powered by <span className="font-bold text-primary-400">Raxwo (Pvt) Ltd</span>
            </a>
          </div>
        </div>
      </section>

      <section className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md md:max-w-lg bg-surface-elevated/95 border border-border rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl text-text">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface p-1 border border-border">
                <img src="/brand/fintarg-logo.svg" alt="Fintarg logo" className="w-5 h-5 object-contain" />
              </div>
              <span className="font-bold text-lg text-text tracking-tight">Fintarg</span>
            </div>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded text-primary-text bg-primary-tint border border-primary-solid/20">
              v2.0
            </span>
          </div>

          <div className="mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-text tracking-tight">
              {authMode === 'signin'
                ? 'Welcome back'
                : signupStep === 'mode'
                ? 'Choose how you will use Fintarg'
                : 'Create your account'}
            </h2>
            <p className="text-xs sm:text-sm mt-1.5 text-muted leading-relaxed">
              {authMode === 'signin'
                ? 'Sign in to access your financial dashboard.'
                : signupStep === 'mode'
                ? 'Pick the flow that matches your income today. You can adjust anytime.'
                : 'Add your sign-in details to complete your account setup.'}
            </p>
          </div>

          {authMode === 'signup' && signupStep === 'mode' ? (
            <div className="space-y-4">
              <div className="space-y-2.5" role="radiogroup" aria-label="Select income flow">
                {workModeOptions.map(option => {
                  const isSelected = workMode === option.value;
                  return (
                    <div
                      key={option.value}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => setWorkMode(option.value)}
                      onKeyDown={e => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          setWorkMode(option.value);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-primary-tint border-primary-solid ring-1 ring-primary-solid/40 shadow-md'
                          : 'bg-surface border-border hover:bg-surface-hover hover:border-border-strong'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm text-text">{option.title}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-primary-solid bg-primary-solid text-white font-bold text-[10px]'
                              : 'border-border-strong'
                          }`}
                        >
                          {isSelected && '✓'}
                        </div>
                      </div>
                      <p className="text-xs text-muted leading-snug mb-2">{option.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {option.features.map(f => (
                          <span
                            key={f}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-hover text-muted border border-border"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                variant="primary"
                className="w-full py-2.5 text-sm font-semibold rounded-xl mt-2"
                onClick={() => chooseWorkMode(workMode)}
              >
                Continue with {workModeOptions.find(o => o.value === workMode)?.title} →
              </Button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {authMode === 'signup' && (
                <div className="p-2.5 rounded-xl bg-surface-hover/80 border border-border flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted font-medium">
                    Flow: <span className="text-text font-semibold">{workModeOptions.find(o => o.value === workMode)?.title}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSignupStep('mode')}
                    className="!p-0 text-primary-text hover:underline text-xs font-semibold"
                  >
                    Change
                  </Button>
                </div>
              )}

              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-text mb-1" htmlFor="signup-name-account">
                    Your name
                  </label>
                  <Input
                    id="signup-name-account"
                    autoComplete="name"
                    placeholder="e.g. Kasun Perera"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text mb-1" htmlFor="signup-email">
                  Email address
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="kasun@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-text" htmlFor="signup-password">
                    Password
                  </label>
                  {authMode === 'signin' && (
                    <a className="text-xs font-medium text-primary-text hover:underline" href="/forgot-password">
                      Forgot password?
                    </a>
                  )}
                </div>
                <PasswordField
                  id="signup-password"
                  autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>

              {authMode === 'signup' && (
                <div className="pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSignupStep('mode')}
                    className="!p-0 text-xs text-muted hover:text-text transition-colors"
                  >
                    ← Back to flow selection
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl border border-danger-solid/40 bg-danger-tint text-danger-text text-xs mt-4 flex items-center gap-2" role="alert">
              <span className="text-danger-solid font-bold">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {(authMode === 'signin' || signupStep === 'credentials') && (
            <Button
              variant="primary"
              className="w-full mt-5 py-2.5 text-sm font-semibold rounded-xl"
              onClick={continueToApp}
              loading={submitting}
              disabled={submitting}
            >
              {authMode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          )}

          <div className="text-center text-xs mt-5 text-muted">
            {authMode === 'signup' ? 'Already have an account?' : 'New to Fintarg?'}{' '}
            <Button
              variant="ghost"
              size="sm"
              className="!p-0 font-semibold text-primary-text hover:underline ml-1"
              onClick={() => {
                setAuthMode(a => (a === 'signup' ? 'signin' : 'signup'));
                setSignupStep('mode');
                setError('');
              }}
            >
              {authMode === 'signup' ? 'Sign in' : 'Create account'}
            </Button>
          </div>

          <div className="text-center text-xs text-muted mt-5 pt-4 border-t border-border flex items-center justify-center gap-1.5">
            <span>Fintarg is a brand of</span>
            <a
              href="https://raxwo.net"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary-text hover:underline transition-colors"
            >
              Raxwo (Pvt) Ltd
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
