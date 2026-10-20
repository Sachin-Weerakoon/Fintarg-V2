'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App layout boundary caught error:', error);
  }, [error]);

  const handleClearSession = () => {
    try {
      document.cookie = 'fintarg_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    } catch {}
    window.location.href = '/welcome';
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-danger-solid/30 bg-surface shadow-2xl text-center space-y-5 animate-rise-in">
        <div className="w-14 h-14 rounded-2xl bg-danger-tint text-danger-text mx-auto flex items-center justify-center">
          <Icon name="alert" size={28} />
        </div>
        <div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-danger-tint text-danger-text mb-2">
            Application Error
          </span>
          <h2 className="text-xl font-bold text-text">Something went wrong</h2>
          <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">
            {error?.message || 'An unexpected error occurred while loading this section. Your data is safe.'}
          </p>
          {error?.digest && (
            <p className="text-[10px] text-muted font-mono mt-1">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => reset()}
            iconLeft={<Icon name="refresh" size={15} />}
            className="w-full sm:w-auto"
          >
            Try Again
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleClearSession}
            iconLeft={<Icon name="logout" size={15} />}
            className="w-full sm:w-auto"
          >
            Sign In Again
          </Button>
          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              iconLeft={<Icon name="home" size={15} />}
              className="w-full sm:w-auto"
            >
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
