'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#070D19] via-[#0B1528] to-[#0F1D32] text-white selection:bg-primary-500/30">
      <div className="onboarding-card max-w-md w-full bg-[#0E1726]/95 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6">
          <BrandLogo variant="full" height={32} />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Reset your password</h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
          Enter your email address and we&apos;ll send you a secure link to reset your account password.
        </p>

        {sent ? (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm">
            Check your email! If an account exists, a password reset link has been dispatched.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field id="email" label={<span className="text-slate-200">Email address</span>} error={error}>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="form-input-dark"
                iconLeft={
                  <svg className="w-4 h-4 transition-colors group-focus-within:text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                }
                required
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-500 shadow-lg text-white"
              loading={loading}
            >
              Send reset link
            </Button>
          </form>
        )}

        <p className="text-center text-xs mt-6 text-slate-400">
          <Link href="/welcome?tab=signin" className="text-primary-400 font-semibold hover:text-primary-300 hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
