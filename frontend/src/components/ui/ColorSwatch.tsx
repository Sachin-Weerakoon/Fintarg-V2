'use client';
import React from 'react';

export interface ColorSwatchProps {
  color: string;
  selected?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

export function ColorSwatch({
  color,
  selected = false,
  onClick,
  ariaLabel,
  className = '',
}: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-10 h-10 rounded-full border-2 transition-all cursor-pointer relative flex items-center justify-center ${
        selected ? 'border-text ring-2 ring-offset-2 ring-primary-500 scale-105' : 'border-transparent hover:scale-105'
      } ${className}`.trim()}
      style={{ backgroundColor: color }}
      aria-label={ariaLabel || `Color swatch ${color}`}
    >
      {selected && <span className="w-2 h-2 rounded-full bg-white shadow-sm" />}
    </button>
  );
}
