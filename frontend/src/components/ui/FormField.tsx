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
        <label htmlFor={id} className="block text-xs font-semibold text-text">
          {label}
          {required && (
            <span className="text-danger-solid ml-1" aria-hidden="true">
              *
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
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs font-medium text-danger-text flex items-center gap-1">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
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
