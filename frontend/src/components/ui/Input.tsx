import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    hasError = false,
    iconLeft,
    iconRight,
    className = '',
    ...props
  },
  ref
) {
  if (iconLeft || iconRight) {
    return (
      <div className="relative flex items-center w-full">
        {iconLeft && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-muted">
            {iconLeft}
          </div>
        )}
        <input
          ref={ref}
          className={`form-input w-full ${iconLeft ? '!pl-10' : ''} ${iconRight ? '!pr-10' : ''} ${
            hasError ? '!border-danger-solid focus:!border-danger-solid' : ''
          } ${className}`.trim()}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3.5 flex items-center pointer-events-none text-muted">
            {iconRight}
          </div>
        )}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      className={`form-input w-full ${
        hasError ? '!border-danger-solid focus:!border-danger-solid' : ''
      } ${className}`.trim()}
      {...props}
    />
  );
});
