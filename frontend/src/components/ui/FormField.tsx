'use client';
import React from 'react';

export interface FormFieldProps {
  id: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  hint,
  error,
  required = false,
  className = '',
  children,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="flex items-center justify-between text-xs font-semibold text-text tracking-tight">
          <span className="flex items-center gap-1">
            {label}
            {required && (
              <span className="text-danger-solid font-bold ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </span>
          {required && (
            <span className="text-[10px] uppercase font-bold text-primary-600 dark:text-primary-400 bg-primary-tint/60 dark:bg-primary-tint/20 border border-primary-500/20 px-1.5 py-0.2 rounded tracking-wider select-none">
              Required
            </span>
          )}
        </label>
      )}

      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            id: (children.props as any).id || id,
            'aria-describedby': describedBy,
            'aria-invalid': error ? 'true' : undefined,
            hasError: Boolean(error) || (children.props as any).hasError,
          })
        : children}

      {hint && !error && (
        <p id={hintId} className="text-xs text-muted leading-relaxed">
          {hint}
        </p>
      )}

      {error && (
        <div id={errorId} className="text-xs font-medium text-danger-text bg-danger-tint/60 dark:bg-danger-tint/20 border border-danger-solid/25 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-danger-solid" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 4.5a1 1 0 012 0v4a1 1 0 01-2 0v-4zm1 8a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
}

export function FormGrid({
  columns = 2,
  className = '',
  children,
  ...props
}: FormGridProps) {
  const gridClasses = {
    1: 'grid grid-cols-1 gap-4',
    2: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  }[columns];

  return (
    <div className={`${gridClasses} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
