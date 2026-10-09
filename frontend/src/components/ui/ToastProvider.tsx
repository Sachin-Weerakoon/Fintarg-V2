'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

export interface ToastFn {
  (message: string, tone?: ToastTone): void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

interface ToastContextValue {
  toast: ToastFn;
  showToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const toastFn = useCallback(
    Object.assign(
      (message: string, tone: ToastTone = 'info') => showToast(message, tone),
      {
        success: (message: string) => showToast(message, 'success'),
        error: (message: string) => showToast(message, 'error'),
        info: (message: string) => showToast(message, 'info'),
      }
    ),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toast: toastFn, showToast, dismissToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
          aria-live="polite"
          role="status"
        >
          {toasts.map(t => (
            <div
              key={t.id}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center justify-between gap-3 transition-all animate-fade-in ${
                t.tone === 'error'
                  ? 'bg-danger-tint border-danger-solid/40 text-danger-text'
                  : t.tone === 'success'
                  ? 'bg-success-tint border-success-solid/40 text-success-text'
                  : 'bg-surface border-border text-text'
              }`}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="font-bold">
                  {t.tone === 'error' ? '⚠' : t.tone === 'success' ? '✓' : 'ℹ'}
                </span>
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss toast"
                className="opacity-70 hover:opacity-100 transition-opacity p-0.5 ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if invoked outside provider
    const fallbackFn = Object.assign(
      (msg: string) => console.log('[Toast fallback]', msg),
      {
        success: (msg: string) => console.log('[Toast fallback]', msg),
        error: (msg: string) => console.error('[Toast fallback]', msg),
        info: (msg: string) => console.info('[Toast fallback]', msg),
      }
    );
    return fallbackFn;
  }
  return ctx.toast;
}
