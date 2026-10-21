import React from 'react';
import { DateField } from './DateField';

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
  // Date inputs share DateField so every date picker on the site looks and behaves the same.
  if (props.type === 'date' && !iconLeft && !iconRight) {
    const { type: _type, ...dateProps } = props;
    return <DateField ref={ref} hasError={hasError} className={className} {...dateProps} />;
  }

  const errorStyles = hasError
    ? '!border-danger-solid focus:!border-danger-solid focus:!ring-4 focus:!ring-danger-solid/15 !shadow-[0_0_0_1px_rgba(220,38,38,0.2)]'
    : '';

  if (iconLeft || iconRight) {
    return (
      <div className="group relative flex items-center w-full">
        {iconLeft && (
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-muted transition-colors duration-200 group-focus-within:text-primary-600 dark:group-focus-within:text-primary-400 select-none">
            {iconLeft}
          </div>
        )}
        <input
          ref={ref}
          className={`form-input w-full ${iconLeft ? '!pl-10.5' : ''} ${iconRight ? '!pr-10.5' : ''} ${errorStyles} ${className}`.trim()}
          {...props}
        />
        {iconRight && (
          <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-muted transition-colors duration-200 group-focus-within:text-primary-600 dark:group-focus-within:text-primary-400 select-none">
            {iconRight}
          </div>
        )}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      className={`form-input w-full ${errorStyles} ${className}`.trim()}
      {...props}
    />
  );
});
