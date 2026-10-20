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
          className="flex items-center justify-between text-xs font-semibold text-text tracking-tight"
        >
          <span className="flex items-center gap-1">
            {label}
            {required && (
              <span className="text-danger-solid font-bold ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </span>
          {required && (
            <span className="text-[10px] uppercase font-semibold text-primary-600 dark:text-primary-400 bg-primary-500/10 dark:bg-primary-400/10 border border-primary-500/20 px-2 py-0.5 rounded-full tracking-wider select-none">
              Required
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
        <p id={hintId} className="text-xs text-muted leading-relaxed">
          {hint}
        </p>
      )}

      {error && (
        <div id={errorId} className="text-xs font-medium text-danger-text bg-danger-tint/70 dark:bg-danger-tint/20 border border-danger-solid/30 px-2.5 py-1.5 rounded-lg flex items-center gap-2 shadow-xs">
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-danger-solid" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 4.5a1 1 0 012 0v4a1 1 0 01-2 0v-4zm1 8a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
