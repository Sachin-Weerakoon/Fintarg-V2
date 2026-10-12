'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { PasswordField } from '@/components/ui/PasswordField';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function ResetPassword({ params }: { params: Promise<{ token: string }> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setToken(p.token));
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Invalid or expired token.');
        return;
      }
      router.push('/welcome?tab=signin');
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

        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Set a new password</h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
          Choose a secure password with at least 8 characters for your account.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <Field id="password" label={<span className="text-slate-200">New password</span>} error={error}>
            <PasswordField
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              placeholder="At least 8 characters"
              className="form-input-dark"
              iconLeft={
                <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
            Update password
          </Button>
        </form>

        <p className="text-center text-xs mt-6 text-slate-400">
          <Link href="/welcome?tab=signin" className="text-primary-400 font-semibold hover:text-primary-300 hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
