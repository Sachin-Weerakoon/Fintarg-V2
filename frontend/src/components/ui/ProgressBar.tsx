import React from 'react';

export type ProgressTone = 'primary' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  size?: ProgressSize;
  label?: React.ReactNode;
  showValue?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'primary',
  size = 'md',
  label,
  showValue = false,
  className = '',
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));

  const sizeClasses: Record<ProgressSize, string> = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const toneClasses: Record<ProgressTone, string> = {
    primary: 'bg-primary-500',
    success: 'bg-success-solid',
    warning: 'bg-warning-solid',
    danger: 'bg-danger-solid',
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`.trim()}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-medium">
          {label && <span className="text-muted">{label}</span>}
          {showValue && <span className="text-text font-semibold num">{Math.round(percent)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={`w-full rounded-full bg-surface-hover border border-border/60 overflow-hidden ${sizeClasses[size]}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${toneClasses[tone]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
