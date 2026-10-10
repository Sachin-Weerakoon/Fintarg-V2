'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/store';
import { apiClient } from '@/services/apiClient';
import { addDocument } from '@/actions/documents';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function DocumentsClient() {
  const { state, dispatch } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setErrorMessage('');
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Maximum file size is 10 MB.');
      setUploading(true);
      const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
      const uploaded = await apiClient<{ id: string }>('/api/backend/files', {
        method: 'POST',
        headers: { 'content-type': mimeType },
        body: file,
      });
      const cleanLabel = (file.name.replace(/\.[^.]+$/, '').trim() || 'Document').slice(0, 120);
      const result = await addDocument({
        id: '',
        type: 'other',
        label: cleanLabel,
        uploadDate: new Date().toISOString().slice(0, 10),
        note: '',
        fileName: file.name.slice(0, 255),
        fileId: uploaded.id,
      });
      if (!result.ok) throw new Error(result.error || 'Could not save document details.');
      window.location.reload();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not upload this document.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Document Vault"
        description="Secure repository for national ID, agreements, salary slips, and deeds."
        actions={
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={upload}
              disabled={uploading}
            />
            <Button
              variant="primary"
              size="md"
              iconLeft={<Icon name="upload" size={16} />}
              onClick={() => fileRef.current?.click()}
              loading={uploading}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        }
      />

      {errorMessage && (
        <div className="p-4 rounded-xl border border-danger-solid/30 bg-danger-tint text-danger-text text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="alert" size={16} />
            <span>{errorMessage}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setErrorMessage('')} aria-label="Dismiss error">
            <Icon name="close" size={14} />
          </Button>
        </div>
      )}

      {state.documents.length === 0 ? (
        <Card
          className={`text-center py-16 px-6 border-dashed border-2 border-border hover:border-primary-500/50 transition-colors cursor-pointer ${
            uploading ? 'opacity-50 pointer-events-none' : ''
          }`}
          onClick={() => fileRef.current?.click()}
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-tint text-primary-text flex items-center justify-center mb-4">
            <Icon name="documents" size={28} />
          </div>
          <h3 className="font-bold text-base text-text mb-1">
            {uploading ? 'Uploading your document...' : 'No documents uploaded yet'}
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto mb-5 leading-relaxed">
            {uploading
              ? 'Please wait while your document is being securely encrypted and stored.'
              : 'Drag and drop or select PDFs, PNGs, and DOCX files. Keep all bank and legal papers securely organized in one place.'}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
            loading={uploading}
          >
            {uploading ? 'Uploading...' : 'Select Files to Upload (Max 10MB)'}
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.documents.map(document => (
            <Card
              key={document.id}
              className="p-5 flex flex-col justify-between hover:shadow-card hover:-translate-y-0.5 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary-tint text-primary-text flex items-center justify-center flex-shrink-0">
                    <Icon name="file-text" size={18} />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted hover:text-danger-text !p-1.5"
                    aria-label={`Delete ${document.label}`}
                    onClick={() => setDeleteConfirmId(document.id)}
                    title="Delete file"
                  >
                    <Icon name="trash" size={15} />
                  </Button>
                </div>
                <div className="font-bold text-sm text-text truncate">{document.label}</div>
                <div className="text-[11px] text-muted mt-1 truncate">{document.fileName || 'Document'}</div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted font-medium num">{document.uploadDate}</span>
                {document.fileId ? (
                  <a
                    className="text-xs font-semibold text-primary-text hover:underline flex items-center gap-1"
                    href={`/api/files/${encodeURIComponent(document.fileId)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>View file</span>
                    <Icon name="arrow-right" size={12} />
                  </a>
                ) : (
                  <span className="text-[11px] text-muted">Stored locally</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Document"
          message="Are you sure you want to remove this document from your vault?"
          confirmLabel="Yes, Delete"
          cancelLabel="No, Keep"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_DOCUMENT', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </PageContainer>
  );
}
