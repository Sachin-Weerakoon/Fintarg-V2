'use client';
import React from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({
  name = 'User',
  src,
  size = 'md',
  className = '',
}: AvatarProps) {
  const sizeClasses: Record<AvatarSize, { container: string; text: string }> = {
    sm: { container: 'w-7 h-7', text: 'text-xs' },
    md: { container: 'w-9 h-9', text: 'text-xs font-semibold' },
    lg: { container: 'w-12 h-12', text: 'text-sm font-bold' },
    xl: { container: 'w-16 h-16', text: 'text-base font-bold' },
  };

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('') || 'U';

  const style = sizeClasses[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${style.container} rounded-full object-cover border border-border flex-shrink-0 ${className}`.trim()}
      />
    );
  }

  return (
    <div
      className={`${style.container} rounded-full bg-primary-tint text-primary-text flex items-center justify-center border border-primary-500/30 flex-shrink-0 select-none ${style.text} ${className}`.trim()}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
