'use client';
import { useState, useTransition } from 'react';

export function useAsyncAction<TArgs extends unknown[], TResult>(action: (...args: TArgs) => Promise<TResult>) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (...args: TArgs) => new Promise<TResult>((resolve, reject) => {
    setError(null);
    startTransition(async () => {
      try {
        resolve(await action(...args));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Request failed';
        setError(message);
        reject(cause);
      }
    });
  });

  return { run, isPending, error, clearError: () => setError(null) };
}