import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    hasError = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const errorStyles = hasError
    ? '!border-danger-solid focus:!border-danger-solid focus:!ring-4 focus:!ring-danger-solid/15 !shadow-[0_0_0_1px_rgba(220,38,38,0.2)]'
    : '';

  return (
    <div className="group relative flex items-center w-full">
      <select
        ref={ref}
        className={`form-input w-full appearance-none !pr-10 !pl-3.5 cursor-pointer select-none ${errorStyles} ${className}`.trim()}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-muted transition-colors duration-200 group-hover:text-text group-focus-within:text-primary-600 dark:group-focus-within:text-primary-400">
        <svg
          className="w-4 h-4 transition-transform duration-200 group-focus-within:rotate-180"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8l4 4 4-4" />
        </svg>
      </div>
    </div>
  );
});
