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
  return (
    <select
      ref={ref}
      className={`form-input w-full cursor-pointer ${
        hasError ? '!border-danger-solid focus:!border-danger-solid' : ''
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </select>
  );
});
