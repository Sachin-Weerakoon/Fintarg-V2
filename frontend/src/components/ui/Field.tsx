import React from 'react';

export interface FieldProps {
  id: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  className = '',
  children,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-text"
        >
          {label}
          {required && (
            <span className="text-danger-solid ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Map children to automatically pass id, aria-describedby and aria-invalid to the primary control */}
      {React.Children.map(children, (child, idx) => {
        if (!React.isValidElement(child)) return child;
        if (idx === 0) {
          return React.cloneElement(child as React.ReactElement<any>, {
            id: (child as any).props.id || id,
            'aria-describedby': describedBy,
            'aria-invalid': error ? 'true' : undefined,
          });
        }
        return child;
      })}

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
