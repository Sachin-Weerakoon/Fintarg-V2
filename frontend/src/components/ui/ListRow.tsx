'use client';
import React from 'react';

export interface ListRowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  amount?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListRow({
  title,
  subtitle,
  icon,
  badge,
  amount,
  meta,
  action,
  onClick,
  className = '',
}: ListRowProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface hover:bg-surface-hover/70 transition-colors gap-3 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`.trim()}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-surface-hover flex items-center justify-center flex-shrink-0 text-text">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text truncate">{title}</span>
            {badge}
          </div>
          {(subtitle || meta) && (
            <div className="text-[11px] text-muted truncate mt-0.5 flex items-center gap-1.5">
              {subtitle && <span>{subtitle}</span>}
              {subtitle && meta && <span>•</span>}
              {meta && <span>{meta}</span>}
            </div>
          )}
        </div>
      </div>

      {(amount || action) && (
        <div className="flex items-center gap-3 flex-shrink-0 text-right">
          {amount && (
            <div className="text-xs font-bold text-text num">
              {amount}
            </div>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
