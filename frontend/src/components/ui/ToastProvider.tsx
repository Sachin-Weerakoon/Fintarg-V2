'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Link from 'next/link';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  title?: string;
  href?: string;
  actionLabel?: string;
}

export interface ToastOptions {
  title?: string;
  href?: string;
  actionLabel?: string;
  /** milliseconds before auto-dismiss (default 4000) */
  duration?: number;
}

export interface ToastFn {
  (message: string, tone?: ToastTone): void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  /** Rich toast with title and optional action link. */
  show: (message: string, tone?: ToastTone, options?: ToastOptions) => void;
}

interface ToastContextValue {
  toast: ToastFn;
  showToast: (message: string, tone?: ToastTone, options?: ToastOptions) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Landing-page palette: deep navy glass, hairline white border, tone-coloured accent. */
const TONE_STYLES: Record<ToastTone, { accent: string; chip: string; glyph: string }> = {
  success: { accent: 'bg-emerald-400', chip: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30', glyph: '✓' },
  error: { accent: 'bg-rose-400', chip: 'bg-rose-400/15 text-rose-300 border-rose-400/30', glyph: '!' },
  warning: { accent: 'bg-amber-400', chip: 'bg-amber-400/15 text-amber-300 border-amber-400/30', glyph: '▲' },
  info: { accent: 'bg-primary-400', chip: 'bg-primary-400/15 text-primary-300 border-primary-400/30', glyph: 'i' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = 'info', options: ToastOptions = {}) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev.slice(-3), { id, message, tone, title: options.title, href: options.href, actionLabel: options.actionLabel }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, options.duration ?? (tone === 'error' || tone === 'warning' ? 6000 : 4000));
  }, []);

  const toastFn = useCallback(
    Object.assign(
      (message: string, tone: ToastTone = 'info') => showToast(message, tone),
      {
        success: (message: string) => showToast(message, 'success'),
        error: (message: string) => showToast(message, 'error'),
        info: (message: string) => showToast(message, 'info'),
        warning: (message: string) => showToast(message, 'warning'),
        show: (message: string, tone: ToastTone = 'info', options?: ToastOptions) => showToast(message, tone, options),
      }
    ),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toast: toastFn, showToast, dismissToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5 w-[min(92vw,380px)] pointer-events-none no-print"
          aria-live="polite"
          role="status"
        >
          {toasts.map(t => {
            const s = TONE_STYLES[t.tone];
            return (
              <div
                key={t.id}
                className="glass-toast pointer-events-auto relative overflow-hidden rounded-2xl pl-5 pr-3 py-3 flex items-start gap-3 animate-fade-in"
              >
                <span className={`absolute left-0 top-0 bottom-0 w-1 ${s.accent}`} aria-hidden="true" />
                <span className={`mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-black flex-shrink-0 ${s.chip}`} aria-hidden="true">
                  {s.glyph}
                </span>
                <div className="flex-1 min-w-0">
                  {t.title && <div className="text-[13px] font-bold text-white leading-snug">{t.title}</div>}
                  <div className={`text-xs leading-relaxed ${t.title ? 'text-slate-300 mt-0.5' : 'text-slate-100 font-medium'}`}>{t.message}</div>
                  {t.href && (
                    <Link href={t.href} onClick={() => dismissToast(t.id)} className="inline-block mt-1.5 text-xs font-semibold text-primary-400 hover:text-primary-300 hover:underline">
                      {t.actionLabel || 'Open'} →
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  aria-label="Dismiss toast"
                  className="text-slate-400 hover:text-white transition-colors p-1 -mr-0.5 rounded-md hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if invoked outside provider
    const fallbackFn = Object.assign((msg: string) => console.log('[Toast fallback]', msg), {
      success: (msg: string) => console.log('[Toast fallback]', msg),
      error: (msg: string) => console.error('[Toast fallback]', msg),
      info: (msg: string) => console.info('[Toast fallback]', msg),
      warning: (msg: string) => console.warn('[Toast fallback]', msg),
      show: (msg: string) => console.log('[Toast fallback]', msg),
    });
    return fallbackFn;
  }
  return ctx.toast;
}
