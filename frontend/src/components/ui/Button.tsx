import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    iconLeft,
    iconRight,
    className = '',
    children,
    type = 'button',
    ...props
  },
  ref
) {
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-xs py-1.5 px-3 min-h-[32px] gap-1.5 rounded-lg',
    md: 'text-sm py-2 px-4 min-h-[40px] gap-2 rounded-xl',
    lg: 'text-base py-2.5 px-5 min-h-[46px] gap-2.5 rounded-xl',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      className={`btn-${variant} ${sizeClasses[size]} ${loading ? 'opacity-80 cursor-wait' : ''} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <span
          className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0"
          aria-hidden="true"
        />
      ) : (
        iconLeft && <span className="flex-shrink-0">{iconLeft}</span>
      )}
      {children && <span>{children}</span>}
      {!loading && iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
});