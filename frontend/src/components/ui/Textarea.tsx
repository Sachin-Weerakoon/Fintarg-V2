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
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`form-input w-full min-h-[80px] py-2.5 resize-y ${
        hasError ? '!border-danger-solid focus:!border-danger-solid' : ''
      } ${className}`.trim()}
      {...props}
    />
  );
});
