'use client';
import { useCallback, useState } from 'react';

/**
 * Per-field validation messages for a form: `check` stores a fresh set and says whether the
 * form may submit; `clear` drops one message as soon as the user edits that field.
 */
export function useFieldErrors<K extends string>() {
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({});

  const check = useCallback((found: Partial<Record<K, string>>) => {
    setErrors(found);
    return Object.values(found).every(message => !message);
  }, []);

  const clear = useCallback((...keys: K[]) => {
    setErrors(prev => {
      if (!keys.some(k => prev[k])) return prev;
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  }, []);

  const reset = useCallback(() => setErrors({}), []);

  return { errors, check, clear, reset };
}
