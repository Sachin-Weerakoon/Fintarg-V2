import React from 'react';

export type StatTone = 'default' | 'success' | 'warning' | 'danger';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  detail?: string;
  tone?: StatTone;
  icon: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  detail,
  tone = 'default',
  icon,
  className = '',
}: StatCardProps) {
  const toneClasses: Record<
    StatTone,
    { iconBg: string; valueColor: string; tagBg: string }
  > = {
    default: {
      iconBg: 'bg-primary-tint text-primary-text',
      valueColor: 'text-text',
      tagBg: 'bg-surface-hover text-muted border border-border',
    },
    success: {
      iconBg: 'bg-success-tint text-success-text',
      valueColor: 'text-success-text',
      tagBg: 'bg-success-tint text-success-text border border-success-solid/20',
    },
    warning: {
      iconBg: 'bg-warning-tint text-warning-text',
      valueColor: 'text-warning-text',
      tagBg: 'bg-warning-tint text-warning-text border border-warning-solid/20',
    },
    danger: {
      iconBg: 'bg-danger-tint text-danger-text',
      valueColor: 'text-danger-text',
      tagBg: 'bg-danger-tint text-danger-text border border-danger-solid/20',
    },
  };

  const style = toneClasses[tone];

  return (
    <div
      className={`card p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card ${className}`.trim()}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${style.iconBg}`}>
          {icon}
        </div>
      </div>
      <div className={`mt-3 text-2xl font-bold tracking-tight num ${style.valueColor}`}>
        {value}
      </div>
      {detail && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${style.tagBg}`}>
            {detail}
          </span>
        </div>
      )}
    </div>
  );
}
