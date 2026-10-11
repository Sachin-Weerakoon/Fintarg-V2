'use client';
import React from 'react';

export interface SettingRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  control: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function SettingRow({
  label,
  description,
  control,
  icon,
  className = '',
}: SettingRowProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 border-b border-border/70 last:border-b-0 ${className}`.trim()}
    >
      <div className="flex items-start gap-3 min-w-0 pr-2">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center flex-shrink-0 mt-0.5 text-muted">
            {icon}
          </div>
        )}
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-text">{label}</div>
          {description && (
            <p className="text-[11px] text-muted leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 self-end sm:self-center">{control}</div>
    </div>
  );
}
