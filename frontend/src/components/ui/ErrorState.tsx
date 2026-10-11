'use client';
import React from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`p-6 rounded-2xl border border-danger-solid/30 bg-danger-tint/30 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 space-y-3 ${className}`.trim()}
    >
      <div
        className="w-12 h-12 rounded-full bg-danger-solid/15 text-danger-text flex items-center justify-center text-xl font-bold"
        aria-hidden="true"
      >
        ⚠
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-text tracking-tight">{title}</h3>
        <p className="text-xs text-muted leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry} className="mt-2">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
