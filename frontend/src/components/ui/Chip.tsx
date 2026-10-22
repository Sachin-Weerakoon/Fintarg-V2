'use client';
import React from 'react';

export interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  selected?: boolean;
  /** 'dark' is for always-dark surfaces such as the notification panel and hero panels. */
  tone?: 'default' | 'dark';
}

/** A small selectable pill, used for filter toggles and quick picks. */
export function Chip({ selected = false, tone = 'default', className = '', children, ...props }: ChipProps) {
  const toneClasses = tone === 'dark'
    ? selected
      ? 'bg-primary-500/20 border-primary-400/40 text-primary-300'
      : 'border-white/10 text-white/60 hover:text-white hover:bg-white/5'
    : selected
      ? 'bg-primary-500 border-primary-500 text-white shadow-sm'
      : 'bg-surface hover:bg-surface-hover text-text border-border';
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${toneClasses} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
