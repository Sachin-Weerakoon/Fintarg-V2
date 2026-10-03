import React, { useState } from 'react';
import { useApp } from '../store';
import type { WorkMode } from '../types';

export default function Onboarding() {
  const { dispatch } = useApp();
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [workMode, setWorkMode] = useState<WorkMode>('salary');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const continueToApp = () => {
    if (authMode === 'signup' && !form.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!form.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    dispatch({
      type: 'SET_PLAN',
      plan: workMode === 'salary' ? 'basic' : 'business',
      workMode,
      name: form.name.trim() || 'Kasun',
    });
  };

  const switchAuthMode = () => {
    setAuthMode(current => current === 'signup' ? 'signin' : 'signup');
    setError('');
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
            A simpler way to manage your salary, businesses, goals, and everyday money.
          </p>
        </div>
        <p className="text-white/45 text-xs">Built for life and business in Sri Lanka.</p>
      </section>

      <section className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="onboarding-card">
          <div className="md:hidden font-bold text-base mb-8" style={{ color: 'var(--color-primary-dark)' }}>Fintarg</div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
              {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>
              {authMode === 'signup' ? 'Start managing your money in a few simple steps.' : 'Sign in to continue to your account.'}
            </p>
          </div>

          <div className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="form-label" htmlFor="signup-name">Full name</label>
                <input id="signup-name" className="form-input" autoComplete="name" placeholder="Kasun Perera" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} />
              </div>
            )}
            <div>
              <label className="form-label" htmlFor="signup-email">Email address</label>
              <input id="signup-email" className="form-input" type="email" autoComplete="email" placeholder="kasun@email.com" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="form-label" htmlFor="signup-password">Password</label>
                {authMode === 'signin' && <button className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>Forgot password?</button>}
              </div>
              <input id="signup-password" className="form-input" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} placeholder="At least 6 characters" value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} />
            </div>
          </div>

          {authMode === 'signup' && (
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>How do you earn?</legend>
              <div className="onboarding-modes">
                <ModeOption value="salary" title="Monthly salary" selected={workMode === 'salary'} onSelect={setWorkMode} />
                <ModeOption value="business" title="Business" selected={workMode === 'business'} onSelect={setWorkMode} />
                <ModeOption value="both" title="Both" selected={workMode === 'both'} onSelect={setWorkMode} />
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>You can change this later in Settings.</p>
            </fieldset>
          )}

          {error && <div className="alert-danger mt-5" role="alert">{error}</div>}

          <button className="btn-primary w-full mt-6" onClick={continueToApp}>
            {authMode === 'signup' ? 'Create account' : 'Sign in'}
          </button>

          <p className="text-center text-sm mt-5" style={{ color: 'var(--color-muted)' }}>
            {authMode === 'signup' ? 'Already have an account?' : 'New to Fintarg?'}{' '}
            <button className="font-semibold min-h-11 px-2" style={{ color: 'var(--color-primary)' }} onClick={switchAuthMode}>
              {authMode === 'signup' ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}

function ModeOption({ value, title, selected, onSelect }: { value: WorkMode; title: string; selected: boolean; onSelect: (value: WorkMode) => void }) {
  return (
    <button type="button" className={`mode-option${selected ? ' selected' : ''}`} aria-pressed={selected} onClick={() => onSelect(value)}>
      <span className="mode-radio">{selected ? '✓' : ''}</span>
      <span>{title}</span>
    </button>
  );
}
