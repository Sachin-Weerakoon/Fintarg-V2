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
          title={dialogState.title}
          size="sm"
          showCloseButton={false}
        >
          <p className="text-sm text-muted mb-6 mt-1">{dialogState.message}</p>
          <div className="flex items-center justify-end gap-3">
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
