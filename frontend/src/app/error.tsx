'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="onboarding-card max-w-md text-center">
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Something went wrong</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
          {error.message || 'An unexpected error occurred.'}
          {error.digest && <span className="block mt-1 text-xs">Error ID: {error.digest}</span>}
        </p>
        <button className="btn-primary" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}
