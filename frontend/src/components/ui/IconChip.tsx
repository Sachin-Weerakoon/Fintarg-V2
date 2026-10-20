'use client';
import React from 'react';

export type IconChipTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';
export type IconChipSize = 'sm' | 'md' | 'lg';

export interface IconChipProps {
  icon: React.ReactNode;
  tone?: IconChipTone;
  size?: IconChipSize;
  className?: string;
}

export function IconChip({
  icon,
  tone = 'default',
  size = 'md',
  className = '',
}: IconChipProps) {
  const sizeClasses: Record<IconChipSize, string> = {
    sm: 'w-7 h-7 rounded-lg text-xs',
    md: 'w-9 h-9 rounded-xl text-sm',
    lg: 'w-11 h-11 rounded-2xl text-base',
  };

  const toneClasses: Record<IconChipTone, string> = {
    default: 'bg-surface-hover text-text border border-border',
    primary: 'bg-primary-tint text-primary-text',
    success: 'bg-success-tint text-success-text',
    warning: 'bg-warning-tint text-warning-text',
    danger: 'bg-danger-tint text-danger-text',
  };

  return (
    <div
      className={`inline-flex items-center justify-center flex-shrink-0 ${sizeClasses[size]} ${toneClasses[tone]} ${className}`.trim()}
      aria-hidden="true"
    >
      {icon}
    </div>
  );
}
