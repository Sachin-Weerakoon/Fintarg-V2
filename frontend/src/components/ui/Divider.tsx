'use client';
import React from 'react';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  label?: React.ReactNode;
  className?: string;
}

export function Divider({
  orientation = 'horizontal',
  label,
  className = '',
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={`inline-block w-px self-stretch bg-border min-h-[20px] ${className}`.trim()}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={`relative flex items-center my-4 ${className}`.trim()}
      >
        <div className="flex-grow border-t border-border" />
        <span className="flex-shrink mx-3 text-xs text-muted font-medium select-none">
          {label}
        </span>
        <div className="flex-grow border-t border-border" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={`border-t border-border my-4 w-full ${className}`.trim()}
    />
  );
}
