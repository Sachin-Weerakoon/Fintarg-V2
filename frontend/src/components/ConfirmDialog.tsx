'use client';
import React from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

export interface ConfirmDialogProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title = 'Please Confirm',
  message,
  confirmLabel = 'Yes, Delete',
  cancelLabel = 'No, Keep',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={true} onClose={onCancel} size="sm" showCloseButton={false}>
      <div className="flex items-start gap-3.5 mb-5">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            tone === 'danger'
              ? 'bg-danger-tint border border-danger-solid/30 text-danger-text'
              : 'bg-primary-tint border border-primary-500/30 text-primary-text'
          }`}
          aria-hidden="true"
        >
          {tone === 'danger' ? (
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
          <h3 className="text-base font-bold text-text tracking-tight">{title}</h3>
          <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">{message}</p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          size="sm"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
