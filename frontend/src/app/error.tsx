'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root error boundary caught error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-danger-solid/30 bg-surface shadow-2xl text-center space-y-5 animate-rise-in">
        <div className="w-14 h-14 rounded-2xl bg-danger-tint text-danger-text mx-auto flex items-center justify-center">
          <Icon name="alert" size={28} />
        </div>
        <div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-danger-tint text-danger-text mb-2">
            System Alert
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-text">Service Temporarily Unavailable</h1>
          <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">
            {error?.message || 'We encountered an unexpected issue connecting to the application server. Your session and records are safe.'}
          </p>
          {error?.digest && (
            <p className="text-[10px] text-muted font-mono mt-1">
              Ref: {error.digest}
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
            Retry Connection
          </Button>
          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              iconLeft={<Icon name="home" size={15} />}
              className="w-full sm:w-auto"
            >
              Reload Application
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
