'use client';

import { useRef } from 'react';
import { useApp } from '@/store';

export default function DocumentsClient() {
  const { state, dispatch } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    dispatch({
      type: 'ADD_DOCUMENT',
      entry: {
        id: 'doc_' + Date.now(),
        type: 'other',
        label: file.name.replace(/\.[^.]+$/, ''),
        uploadDate: new Date().toISOString().slice(0, 10),
        note: 'Personal document',
        fileName: file.name,
      },
    });
    event.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Documents</div>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Keep personal, bank, and work files in one place.</p>
        </div>
        <input ref={fileRef} type="file" className="hidden" onChange={upload} />
        <button className="btn-primary whitespace-nowrap" onClick={() => fileRef.current?.click()}>Add document</button>
      </div>
      {state.documents.length === 0 ? (
        <div className="card text-center py-12">
          <div className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No documents yet</div>
          <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>Upload your first document to keep it easy to find.</p>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>Upload a document</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {state.documents.map(document => (
            <div key={document.id} className="card flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{document.label}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{document.fileName} · {document.uploadDate}</div>
              </div>
              <button className="btn-ghost" aria-label={`Delete ${document.label}`} onClick={() => dispatch({ type: 'DELETE_DOCUMENT', id: document.id })}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
