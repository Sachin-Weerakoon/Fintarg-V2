'use client';
import React from 'react';

export type AlertTone = 'danger' | 'warning' | 'info' | 'success';

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({
  tone = 'danger',
  title,
  children,
  onDismiss,
  className = '',
}: AlertProps) {
  const toneStyles: Record<AlertTone, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    danger: {
      bg: 'bg-danger-tint/60 dark:bg-danger-solid/15',
      border: 'border-danger-solid/35',
      text: 'text-danger-text',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-warning-tint/60 dark:bg-warning-solid/15',
      border: 'border-warning-solid/35',
      text: 'text-warning-text',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-primary-tint/60 dark:bg-primary-500/15',
      border: 'border-primary-500/35',
      text: 'text-primary-text',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
    },
    success: {
      bg: 'bg-success-tint/60 dark:bg-success-solid/15',
      border: 'border-success-solid/35',
      text: 'text-success-text',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
  };

  const style = toneStyles[tone];

  return (
    <div
      role="alert"
      className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all animate-fade-in ${style.bg} ${style.border} ${style.text} ${className}`}
    >
      <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
        {style.icon}
      </div>
      <div className="flex-1 leading-relaxed">
        {title && <div className="font-semibold mb-0.5">{title}</div>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="opacity-70 hover:opacity-100 p-0.5 rounded transition-opacity"
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      )}
    </div>
  );
}
