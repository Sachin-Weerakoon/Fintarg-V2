'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/actions/login';
import { signup } from '@/actions/signup';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';

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
    setError('');
    if (!form.email || !form.password) {
      setError('Please provide your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      if (authMode === 'signup') {
        const result = await signup({
          email: form.email,
          password: form.password,
          name: form.name.trim(),
          workMode,
        });
        if (!result.ok) {
          setError(result.error || 'Could not create account.');
          return;
        }
      } else {
        const result = await login({
          email: form.email,
          password: form.password,
        });
        if (!result.ok) {
          setError(result.error || 'Invalid email or password.');
          return;
        }
      }

      router.push('/');
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
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))' }}
          >
            <Icon name="bolt" size={22} className="text-white" />
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
          <span className="font-semibold text-white/90">Bank-grade security</span>
        </div>
      </section>

      <section className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className={`onboarding-card${authMode === 'signup' && signupStep === 'mode' ? ' onboarding-card-wide' : ''}`}>
          <div className="md:hidden font-bold text-base mb-8 text-primary-text">Fintarg</div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-text">
              {authMode === 'signin'
                ? 'Welcome back'
                : signupStep === 'mode'
                ? 'Choose how you will use the app'
                : 'Create your account'}
            </h2>
            <p className="text-sm mt-2 text-muted">
              {authMode === 'signin'
                ? 'Sign in to continue to your account.'
                : signupStep === 'mode'
                ? 'Pick the view that matches your income today. You can switch later without losing data.'
                : 'Add your sign-in details to finish setting up your account.'}
            </p>
          </div>

          {authMode === 'signup' && signupStep === 'mode' ? (
            <>
              <Field id="signup-name" label="Your name">
                <Input
                  autoComplete="name"
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </Field>
              <div className="onboarding-choice-grid mt-4" role="group" aria-label="Choose how you will use the app">
                {workModeOptions.map(option => (
                  <article
                    key={option.value}
                    className={`onboarding-choice-card${workMode === option.value ? ' selected' : ''}`}
                  >
                    <h3>{option.title}</h3>
                    <p>{option.description}</p>
                    <ul>
                      {option.features.map(feature => (
                        <li key={feature}>
                          <span aria-hidden="true">+</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={workMode === option.value ? 'primary' : 'secondary'}
                      className="w-full"
                      onClick={() => chooseWorkMode(option.value)}
                    >
                      {option.button}
                    </Button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              {authMode === 'signup' && (
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="text-sm text-muted">
                    Selected: {workModeOptions.find(option => option.value === workMode)?.title}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setSignupStep('mode')}>
                    Change
                  </Button>
                </div>
              )}
              <div className="space-y-4">
                {authMode === 'signup' && (
                  <Field id="signup-name-account" label="Your name">
                    <Input
                      autoComplete="name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </Field>
                )}
                <Field id="signup-email" label="Email address">
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="kasun@email.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </Field>
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
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => (authMode === 'signup' ? setSignupStep('mode') : setAuthMode('signup'))}
              >
                Back
              </Button>
            </>
          )}

          {error && (
            <div className="p-3 rounded-xl border border-danger-solid/30 bg-danger-tint text-danger-text text-xs mt-5" role="alert">
              {error}
            </div>
          )}

          {(authMode === 'signin' || signupStep === 'credentials') && (
            <Button
              variant="primary"
              className="w-full mt-6"
              onClick={continueToApp}
              loading={submitting}
              disabled={submitting}
            >
              {authMode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          )}

          <p className="text-center text-sm mt-5 text-muted">
            {authMode === 'signup' ? 'Already have an account?' : 'New to Fintarg?'}{' '}
            <button
              className="font-semibold min-h-11 px-2 text-primary-text hover:underline"
              onClick={() => {
                setAuthMode(a => (a === 'signup' ? 'signin' : 'signup'));
                setSignupStep('mode');
                setError('');
              }}
            >
              {authMode === 'signup' ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
