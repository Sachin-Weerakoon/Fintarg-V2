'use client';
import React, { useState } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = React.useId();

  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  }[position];

  return (
    <div
      className={`relative inline-flex ${className}`.trim()}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      <div aria-describedby={isVisible ? tooltipId : undefined}>{children}</div>

      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute ${posClasses} z-50 px-2.5 py-1 text-xs rounded-lg bg-chrome-900 text-white shadow-lg whitespace-nowrap pointer-events-none border border-white/10 animate-fade-in`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
