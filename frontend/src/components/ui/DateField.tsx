'use client';
import React from 'react';
import { Icon } from './Icon';

export interface DateFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  hasError?: boolean;
}

// Opens the browser's native calendar. showPicker() can throw (unsupported browser,
// no user gesture, cross-origin iframe); then the field still works by typing.
function openPicker(input: HTMLInputElement | null) {
  if (!input || input.disabled || input.readOnly) return;
  try {
    input.showPicker?.();
  } catch {
    input.focus();
  }
}

export const DateField = React.forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  { hasError = false, className = '', onClick, ...props },
  ref
) {
  const innerRef = React.useRef<HTMLInputElement | null>(null);
  const setRefs = React.useCallback((node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  const errorStyles = hasError
    ? '!border-danger-solid focus:!border-danger-solid focus:!ring-4 focus:!ring-danger-solid/15 !shadow-[0_0_0_1px_rgba(220,38,38,0.2)]'
    : '';

  // One calendar icon only: the native indicator is hidden (see .date-field-input in
  // globals.css), and both the icon and the whole field open the picker.
  return (
    <div className="group relative flex items-center w-full">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Open calendar"
        disabled={props.disabled}
        onClick={() => openPicker(innerRef.current)}
        className="absolute inset-y-0 left-3.5 flex items-center cursor-pointer text-muted transition-colors duration-200 hover:text-primary-600 group-focus-within:text-primary-600 dark:group-focus-within:text-primary-400 select-none disabled:cursor-not-allowed"
      >
        <Icon name="calendar" size={16} />
      </button>
      <input
        ref={setRefs}
        type="date"
        className={`form-input date-field-input w-full !pl-9 !pr-2 cursor-pointer ${errorStyles} ${className}`.trim()}
        onClick={e => {
          onClick?.(e);
          if (!e.defaultPrevented) openPicker(e.currentTarget);
        }}
        {...props}
      />
    </div>
  );
});
