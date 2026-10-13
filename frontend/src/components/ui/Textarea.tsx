import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    hasError = false,
    className = '',
    rows = 3,
    ...props
  },
  ref
) {
  const errorStyles = hasError
    ? '!border-danger-solid focus:!border-danger-solid focus:!ring-4 focus:!ring-danger-solid/15 !shadow-[0_0_0_1px_rgba(220,38,38,0.2)]'
    : '';

  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`form-input w-full min-h-[80px] py-2.5 px-3.5 resize-y leading-relaxed ${errorStyles} ${className}`.trim()}
      {...props}
    />
  );
});
