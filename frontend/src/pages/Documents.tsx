import React, { useRef } from 'react';
import { useApp } from '../store';

export default function Documents() {
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Document Vault</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Keep personal, bank, and work files in one safe place.</p>
        </div>
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" className="hidden" onChange={upload} />
          <button className="btn-primary !min-h-[38px] !text-xs font-semibold whitespace-nowrap" onClick={() => fileRef.current?.click()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {state.documents.length === 0 ? (
        <div className="card text-center py-16 px-6 border-dashed border-2 border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          </div>
          <div className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1">No documents uploaded yet</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
            Drag and drop or select files. Keep all bank and legal papers securely organized.
          </p>
          <button className="btn-secondary !text-xs font-semibold" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
            Select Files to Upload
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.documents.map(document => (
            <div key={document.id} className="card p-5 border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                  </div>
                  <button className="btn-ghost !p-1.5 text-slate-400 hover:text-rose-600 transition-colors" aria-label={`Delete ${document.label}`} onClick={() => dispatch({ type: 'DELETE_DOCUMENT', id: document.id })} title="Delete file">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{document.label}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">{document.fileName || 'Document'}</div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">{document.uploadDate}</span>
                <span className="text-[11px] text-slate-400">Stored locally</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
