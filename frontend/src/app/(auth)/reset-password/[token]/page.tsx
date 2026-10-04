'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPassword({ params }: { params: Promise<{ token: string }> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useState(() => {
    params.then(p => setToken(p.token));
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) return;
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword: password }) });
    const data = await res.json();
    if (!res.ok || !data.ok) { setError(data.error || 'Invalid or expired token.'); return; }
    router.push('/welcome');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-primary-dark)' }}>
      <div className="onboarding-card max-w-md">
        <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Set a new password</h2>
        <form onSubmit={submit} className="space-y-4 mt-6">
          <div>
            <label className="form-label" htmlFor="password">New password</label>
            <input id="password" className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} />
          </div>
          {error && <div className="alert-danger" role="alert">{error}</div>}
          <button type="submit" className="btn-primary w-full">Update password</button>
        </form>
      </div>
    </div>
  );
}
