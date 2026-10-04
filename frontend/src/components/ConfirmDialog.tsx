'use client';
import { useState } from 'react';

export default function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="font-semibold text-base mb-3" style={{ color: 'var(--color-text)' }}>Confirm</div>
        <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>{message}</p>
        <div className="flex gap-3">
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
