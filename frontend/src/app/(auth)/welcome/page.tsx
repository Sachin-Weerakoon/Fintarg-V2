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
    } catch (e) {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-primary-dark)' }}>
      <section className="hidden md:flex flex-col justify-between px-16 py-12 flex-1" style={{ color: '#fff' }}>
        <div className="text-white font-bold text-lg">Fintarg</div>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Take control<br />
            <span style={{ color: 'var(--color-primary)' }}>of your month</span>
          </h1>
          <p className="text-white/70 text-base max-w-sm leading-relaxed">
            Track income and expenses, plan savings and keep your papers in one safe place.
          </p>
          <ul className="mt-10 space-y-4 text-sm text-white/85">
            {['See if you can make it through the month', 'Plan daily and monthly savings', 'Generate letters in seconds'].map(feature => (
              <li key={feature} className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: 'var(--color-primary)' }} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-white/45 text-xs">Built for life and business in Sri Lanka.</p>
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

