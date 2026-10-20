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
  const errorStyles = hasError
    ? '!border-danger-solid focus:!border-danger-solid focus:!ring-4 focus:!ring-danger-solid/15 !shadow-[0_0_0_1px_rgba(220,38,38,0.2)]'
    : '';

  return (
    <div className="group relative flex items-center w-full">
      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-muted transition-colors duration-200 group-focus-within:text-primary-600 dark:group-focus-within:text-primary-400 select-none">
        <Icon name="calendar" size={16} />
      </div>
      <input
        ref={ref}
        type="date"
        className={`form-input w-full !pl-10.5 ${errorStyles} ${className}`.trim()}
        {...props}
      />
    </div>
  );
});
