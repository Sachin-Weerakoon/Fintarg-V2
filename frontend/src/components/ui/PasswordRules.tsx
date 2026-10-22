'use client';
import React from 'react';
import { PASSWORD_RULES } from '@/lib/passwordPolicy';

/** Compact live checklist shown under a new-password field. */
export function PasswordRules({ password, tone = 'app', className = '' }: { password: string; tone?: 'app' | 'dark'; className?: string }) {
  const idle = tone === 'dark' ? 'text-slate-400' : 'text-muted';
  const met = tone === 'dark' ? 'text-emerald-400' : 'text-success-text';
  return (
    <ul className={`flex flex-wrap gap-x-3 gap-y-1 text-[11px] ${className}`.trim()} aria-label="Password requirements">
      {PASSWORD_RULES.map(rule => {
        const ok = rule.test(password);
        return (
          <li key={rule.id} className={`inline-flex items-center gap-1 ${ok ? met : idle}`}>
            <span aria-hidden="true">{ok ? '✓' : '○'}</span>
            <span>{rule.label}</span>
            <span className="sr-only">{ok ? '(met)' : '(missing)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
