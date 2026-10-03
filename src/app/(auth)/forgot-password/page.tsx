'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@')) { setError('Please enter a valid email.'); return; }
    await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-primary-dark)' }}>
      <div className="onboarding-card max-w-md">
        <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Reset your password</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>Enter your email and we'll send you a reset link.</p>
        {sent ? (
          <div className="alert-warning">Check your email for the reset link.</div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="form-label" htmlFor="email">Email address</label>
              <input id="email" className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {error && <div className="alert-danger" role="alert">{error}</div>}
            <button type="submit" className="btn-primary w-full">Send reset link</button>
          </form>
        )}
        <p className="text-center text-sm mt-5" style={{ color: 'var(--color-muted)' }}>
          <Link href="/welcome" style={{ color: 'var(--color-primary)' }}>← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
