'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary' | 'warning';
}

export type ConfirmFn = (options: string | ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    tone: 'danger' | 'primary' | 'warning';
  }>({
    isOpen: false,
    title: 'Confirm Action',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    tone: 'danger',
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirmAction: ConfirmFn = useCallback((options: string | ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      // Resolve any previous pending confirm dialog as false
      if (resolverRef.current) {
        resolverRef.current(false);
      }
      resolverRef.current = resolve;

      if (typeof options === 'string') {
        setDialogState({
          isOpen: true,
          title: 'Please Confirm',
          message: options,
          confirmLabel: 'Yes',
          cancelLabel: 'No',
          tone: 'danger',
        });
      } else {
        setDialogState({
          isOpen: true,
          title: options.title || 'Please Confirm',
          message: options.message,
          confirmLabel: options.confirmLabel || 'Yes',
          cancelLabel: options.cancelLabel || 'No',
          tone: options.tone || 'danger',
        });
      }
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={confirmAction}>
      {children}
      {dialogState.isOpen && (
        <Modal
          isOpen={true}
          onClose={() => handleClose(false)}
          size="sm"
          showCloseButton={false}
        >
          <div className="flex items-start gap-3.5 mb-5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                dialogState.tone === 'danger'
                  ? 'bg-danger-tint border border-danger-solid/30 text-danger-text'
                  : 'bg-primary-tint border border-primary-500/30 text-primary-text'
              }`}
              aria-hidden="true"
            >
              {dialogState.tone === 'danger' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-text tracking-tight">{dialogState.title}</h3>
              <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">{dialogState.message}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleClose(false)}
              autoFocus
            >
              {dialogState.cancelLabel}
            </Button>
            <Button
              variant={dialogState.tone === 'danger' ? 'danger' : 'primary'}
              size="sm"
              onClick={() => handleClose(true)}
            >
              {dialogState.confirmLabel}
            </Button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return async (options: string | ConfirmOptions) => {
      const msg = typeof options === 'string' ? options : options.message;
      console.warn('[useConfirm] invoked outside of ConfirmProvider:', msg);
      return false;
    };
  }
  return ctx;
}
