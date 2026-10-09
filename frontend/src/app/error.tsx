'use client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <Card className="max-w-md w-full text-center p-8 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-danger-tint border border-danger-solid/20 flex items-center justify-center text-danger-text mx-auto">
          <Icon name="alert" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text">
            Something went wrong
          </h2>
          <p className="text-sm text-muted mt-1.5">
            {error.message || 'An unexpected error occurred while loading this view.'}
          </p>
          {error.digest && (
            <p className="text-xs text-muted/70 mt-2 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
        </div>
      </Card>
    </div>
  );
}
