'use client';
import React from 'react';
import { Icon } from './Icon';

export interface DateFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  hasError?: boolean;
}

export const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  { hasError = false, className = '', ...props },
  ref
) {
  return (
    <div className="relative flex items-center w-full">
      <div className="absolute left-3.5 flex items-center pointer-events-none text-muted">
        <Icon name="calendar" size={16} />
      </div>
      <input
        ref={ref}
        type="date"
        className={`form-input w-full !pl-10 ${
          hasError ? '!border-danger-solid focus:!border-danger-solid' : ''
        } ${className}`.trim()}
        {...props}
      />
    </div>
  );
});
