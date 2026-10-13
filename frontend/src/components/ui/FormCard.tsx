'use client';
import React from 'react';
import { Icon, type IconName } from './Icon';

export interface FormCardProps {
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: IconName;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  accent?: 'primary' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function FormCard({
  id,
  title,
  description,
  icon,
  badge,
  actions,
  accent = 'primary',
  children,
  footer,
  className = '',
}: FormCardProps) {
  const accentGradients = {
    primary: 'from-primary-500 via-primary-400 to-primary-600',
    success: 'from-success-solid via-emerald-400 to-teal-600',
    warning: 'from-warning-solid via-amber-400 to-orange-500',
    danger: 'from-danger-solid via-rose-400 to-red-600',
  }[accent];

  const iconTones = {
    primary: 'bg-primary-tint text-primary-text border-primary-500/25',
    success: 'bg-success-tint text-success-text border-success-solid/25',
    warning: 'bg-warning-tint text-warning-text border-warning-solid/25',
    danger: 'bg-danger-tint text-danger-text border-danger-solid/25',
  }[accent];

  return (
    <div
      id={id}
      className={`form-card group/form flex flex-col justify-between transition-all duration-200 ${className}`.trim()}
    >
      {/* Top Accent Gradient Bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${accentGradients} opacity-90`} />

      <div className="p-5 sm:p-6 space-y-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/40">
          <div className="flex items-start gap-3">
            {icon && (
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-xs transition-transform duration-200 group-hover/form:scale-105 ${iconTones}`}
              >
                <Icon name={icon} size={18} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-text tracking-tight">
                  {title}
                </h3>
                {badge && (
                  <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-tint text-primary-text border border-primary-500/25">
                    {badge}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-xs text-muted mt-0.5 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div>}
        </div>

        {/* Content Body */}
        <div className="space-y-3.5 pt-1">{children}</div>
      </div>

      {/* Footer if supplied */}
      {footer && (
        <div className="px-5 py-3.5 sm:px-6 bg-surface-hover/30 border-t border-border/40 flex items-center justify-end gap-2.5 rounded-b-2xl">
          {footer}
        </div>
      )}
    </div>
  );
}
