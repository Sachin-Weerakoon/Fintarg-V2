'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';

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
      setError('Password must be at least 8 characters.');
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
      router.push('/welcome');
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
        <h2 className="text-2xl font-bold tracking-tight text-text mb-2">Set a new password</h2>
        <form onSubmit={submit} className="space-y-4 mt-6">
          <Field id="password" label="New password" error={error}>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              placeholder="At least 8 characters"
              required
            />
          </Field>
          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
