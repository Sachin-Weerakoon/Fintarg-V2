import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  helper?: React.ReactNode;
  cta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  helper,
  cta,
  action,
  className = '',
}: EmptyStateProps) {
  const button = cta || action;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-surface/50 ${className}`.trim()}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-surface-hover border border-border flex items-center justify-center text-muted mb-3.5 shadow-sm">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-text mb-1">
        {title}
      </h3>
      {helper && (
        <p className="text-xs text-muted max-w-sm mb-4">
          {helper}
        </p>
      )}
      {button && <div className="mt-1">{button}</div>}
    </div>
  );
}
