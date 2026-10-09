'use client';
import React, { useState } from 'react';
import { Icon } from './Icon';

export interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  hasError?: boolean;
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ hasError = false, className = '', ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative flex items-center w-full">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={`form-input w-full !pr-10 ${
            hasError ? '!border-danger-solid focus:!border-danger-solid' : ''
          } ${className}`.trim()}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-2.5 p-1 rounded-md text-muted hover:text-text hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={18} />
        </button>
      </div>
    );
  }
);
