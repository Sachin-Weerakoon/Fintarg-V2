'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { PasswordField } from '@/components/ui/PasswordField';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { PasswordRules } from '@/components/ui/PasswordRules';
import { passwordProblem } from '@/lib/passwordPolicy';
import { apiErrorMessage } from '@/services/apiClient';

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
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
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
        setError(apiErrorMessage(data, 'Invalid or expired token.'));
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

        <h2 className="text-2xl font-bold tracking-tight text-white mb-6">Set a new password</h2>

        <form onSubmit={submit} noValidate className="space-y-4">
          <Field id="password" label={<span className="text-white/90">New password</span>} error={error}>
            <PasswordField
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a password"
              className="form-input-dark"
              iconLeft={
                <svg className="w-4 h-4 transition-colors group-focus-within:text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              required
            />
            <PasswordRules password={password} tone="dark" />
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

        <p className="text-center text-xs mt-6 text-white/60">
          <Link href="/welcome?tab=signin" className="text-primary-400 font-semibold hover:text-primary-300 hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
