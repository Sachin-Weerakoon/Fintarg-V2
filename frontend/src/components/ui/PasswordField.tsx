'use client';
import React, { useState } from 'react';
import { Icon } from './Icon';

export interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  hasError?: boolean;
  iconLeft?: React.ReactNode;
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ hasError = false, iconLeft, className = '', ...props }, ref) {
    const [visible, setVisible] = useState(false);

    const errorStyles = hasError
      ? '!border-danger-solid focus:!border-danger-solid focus:!ring-4 focus:!ring-danger-solid/15 !shadow-[0_0_0_1px_rgba(220,38,38,0.2)]'
      : '';

    return (
      <div className="group relative flex items-center w-full">
        {iconLeft && (
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-muted transition-colors duration-200 group-focus-within:text-primary-600 dark:group-focus-within:text-primary-400 select-none">
            {iconLeft}
          </div>
        )}
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={`form-input w-full ${iconLeft ? '!pl-10.5' : ''} !pr-11 ${errorStyles} ${className}`.trim()}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-2 my-auto flex items-center justify-center h-7 w-7 rounded-lg text-muted hover:text-text hover:bg-surface-hover/80 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer"
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={16} />
        </button>
      </div>
    );
  }
);
