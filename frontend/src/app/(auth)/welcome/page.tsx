'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type WorkMode = 'salary' | 'business' | 'both';
type WorkModeOption = { value: WorkMode; title: string; description: string; features: string[]; button: string };

const workModeOptions: WorkModeOption[] = [
  {
    value: 'salary',
    title: 'I earn a monthly salary',
    description: 'For employees with regular pay',
    features: ['Payday planning', 'Deductions and take-home pay', 'Savings and career goals'],
    button: 'Choose Salary',
  },
  {
    value: 'business',
    title: 'I run a business',
    description: 'For one or more businesses',
    features: ['Branches and daily revenue', 'Utilities and operating costs', 'Targets and projections'],
    button: 'Choose Business',
  },
  {
    value: 'both',
    title: 'Both',
    description: 'A unified view for both',
    features: ['Separate workspaces', 'Combined cash position', 'Clear source-by-source goals'],
    button: 'Choose Both',
  },
];

export default function Welcome() {
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [signupStep, setSignupStep] = useState<'mode' | 'credentials'>('mode');
  const [workMode, setWorkMode] = useState<WorkMode>('salary');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const router = useRouter();

  const chooseWorkMode = (mode: WorkMode) => {
    if (!form.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setWorkMode(mode);
    setSignupStep('credentials');
    setError('');
  };

  const continueToApp = async () => {
    setError('');
    if (authMode === 'signup' && !form.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!form.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: authMode, name: form.name, email: form.email, password: form.password, workMode }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }
      router.push('/');
    } catch {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #09121f 0%, #0d192c 50%, #0b1a2e 100%)' }}>
      <section className="hidden md:flex flex-col justify-between px-16 py-12 flex-1 relative overflow-hidden" style={{ color: '#fff' }}>
        {/* Ambient background glow */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg bg-gradient-to-br from-cyan-500 to-blue-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div>
            <div className="text-white font-extrabold text-xl tracking-tight flex items-center gap-2">
              <span>Fintarg</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded text-cyan-300 bg-cyan-950/80 border border-cyan-800/80">v2.0</span>
            </div>
            <div className="text-xs text-slate-400 font-medium">Personal & Business Finance</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Sri Lanka's Modern Financial OS</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight mb-4 text-white">
            Take total control <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">of your month</span>
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Eliminate cashflow surprises. Track recurring burn, automate daily savings goals, and manage your complete wealth portfolio.
          </p>
          <ul className="mt-8 space-y-3.5 text-sm text-slate-200">
            {['Predict shortfalls and burn rate before month end', 'Set automated daily savings targets for every goal', 'Secure document vault & automated legal letter generator'].map(feature => (
              <li key={feature} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-cyan-500/20 text-cyan-400 flex-shrink-0 text-xs font-bold">✓</span>
                <span className="leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Built specifically for Sri Lankan currency & laws.</span>
          <span className="font-semibold text-slate-300">Bank-grade security</span>
        </div>
      </section>
      <section className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className={`onboarding-card${authMode === 'signup' && signupStep === 'mode' ? ' onboarding-card-wide' : ''}`}>
          <div className="md:hidden font-bold text-base mb-8" style={{ color: 'var(--color-primary-dark)' }}>Fintarg</div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
              {authMode === 'signin' ? 'Welcome back' : signupStep === 'mode' ? 'Choose how you will use the app' : 'Create your account'}
            </h2>
            <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>
              {authMode === 'signin'
                ? 'Sign in to continue to your account.'
                : signupStep === 'mode'
                  ? 'Pick the view that matches your income today. You can switch later without losing data.'
                  : 'Add your sign-in details to finish setting up your account.'}
            </p>
          </div>

          {authMode === 'signup' && signupStep === 'mode' ? (
            <>
              <div>
                <label className="form-label" htmlFor="signup-name">Your name</label>
                <input id="signup-name" className="form-input onboarding-name-input" autoComplete="name" placeholder="Enter your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="onboarding-choice-grid" role="group" aria-label="Choose how you will use the app">
                {workModeOptions.map(option => (
                  <article key={option.value} className={`onboarding-choice-card${workMode === option.value ? ' selected' : ''}`}>
                    <h3>{option.title}</h3>
                    <p>{option.description}</p>
                    <ul>
                      {option.features.map(feature => (
                        <li key={feature}><span aria-hidden="true">+</span>{feature}</li>
                      ))}
                    </ul>
                    <button type="button" className={workMode === option.value ? 'btn-primary' : 'btn-secondary'} onClick={() => chooseWorkMode(option.value)}>
                      {option.button}
                    </button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              {authMode === 'signup' && (
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Selected: {workModeOptions.find(option => option.value === workMode)?.title}</span>
                  <button type="button" className="btn-ghost" onClick={() => setSignupStep('mode')}>Change</button>
                </div>
              )}
              <div className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="form-label" htmlFor="signup-name-account">Your name</label>
                    <input id="signup-name-account" className="form-input" autoComplete="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                )}
                <div>
                  <label className="form-label" htmlFor="signup-email">Email address</label>
                  <input id="signup-email" className="form-input" type="email" autoComplete="email" placeholder="kasun@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="form-label" htmlFor="signup-password">Password</label>
                    {authMode === 'signin' && <a className="text-xs font-medium" href="/forgot-password" style={{ color: 'var(--color-primary)' }}>Forgot password?</a>}
                  </div>
                  <input id="signup-password" className="form-input" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} placeholder="At least 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              </div>
              <button type="button" className="btn-ghost mt-3" onClick={() => authMode === 'signup' ? setSignupStep('mode') : setAuthMode('signup')}>Back</button>
            </>
          )}

          {error && <div className="alert-danger mt-5" role="alert">{error}</div>}
          {(authMode === 'signin' || signupStep === 'credentials') && (
            <button className="btn-primary w-full mt-6" onClick={continueToApp}>
              {authMode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          )}
          <p className="text-center text-sm mt-5" style={{ color: 'var(--color-muted)' }}>
            {authMode === 'signup' ? 'Already have an account?' : 'New to Fintarg?'}{' '}
            <button className="font-semibold min-h-11 px-2" style={{ color: 'var(--color-primary)' }} onClick={() => { setAuthMode(a => a === 'signup' ? 'signin' : 'signup'); setSignupStep('mode'); setError(''); }}>
              {authMode === 'signup' ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}

