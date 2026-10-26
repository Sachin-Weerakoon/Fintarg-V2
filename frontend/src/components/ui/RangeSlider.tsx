'use client';
import React from 'react';

export interface RangeSliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
}

/** Native range input in the brand colour. */
export function RangeSlider({ value, onChange, className = '', ...props }: RangeSliderProps) {
  return (
    <input
      type="range"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className={`accent-[var(--color-primary-500)] cursor-pointer ${className}`.trim()}
      {...props}
    />
  );
}
