'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@')) {
      setError('Please enter a valid email.');
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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="onboarding-card max-w-md w-full">
        <h2 className="text-2xl font-bold tracking-tight text-text mb-2">Reset your password</h2>
        <p className="text-sm text-muted mb-6">Enter your email and we&apos;ll send you a reset link.</p>
        {sent ? (
          <div className="p-4 rounded-xl border border-warning-solid/30 bg-warning-tint text-warning-text text-sm">
            Check your email for the reset link.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field id="email" label="Email address" error={error}>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@domain.com"
                required
              />
            </Field>
            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              Send reset link
            </Button>
          </form>
        )}
        <p className="text-center text-sm mt-5 text-muted">
          <Link href="/welcome" className="text-primary-text font-medium hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
