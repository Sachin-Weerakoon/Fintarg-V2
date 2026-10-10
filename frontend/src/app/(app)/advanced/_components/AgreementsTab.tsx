'use client';
import React, { useState, useRef } from 'react';
import { useApp, formatRs } from '@/store';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FormField, FormGrid } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { DateField } from '@/components/ui/DateField';
import { MoneyField } from '@/components/ui/MoneyField';
import { Select } from '@/components/ui/Select';
import { FilterBar } from '@/components/ui/FilterBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import type { Agreement } from '@/types';

const BLANK_FORM = {
  title: '',
  otherParty: '',
  startDate: '',
  endDate: '',
  value: '',
  summary: '',
  status: 'draft' as Agreement['status'],
  fileName: '',
};

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export function AgreementsTab() {
  const { state, dispatch, showToast } = useApp();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Agreement['status']>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...BLANK_FORM });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const filtered = state.agreements.filter(a => {
    const matchSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.otherParty.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, target: 'new' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (target === 'new') setForm(f => ({ ...f, fileName: file.name }));
    else setEditForm(f => ({ ...f, fileName: file.name }));
    e.target.value = '';
    showToast(`Attached ${file.name}`, 'info');
  };

  const submit = () => {
    if (!form.title.trim() || !form.otherParty.trim()) {
      showToast('Title and other party are required.', 'error');
      return;
    }
    dispatch({
      type: 'ADD_AGREEMENT',
      entry: { id: 'ag_' + Date.now(), ...form, value: Number(form.value) || 0 },
    });
    setForm({ ...BLANK_FORM });
    setShowForm(false);
    showToast('Agreement saved successfully.', 'success');
  };

  const startEdit = (a: Agreement) => {
    setEditingId(a.id);
    setEditForm({
      title: a.title,
      otherParty: a.otherParty,
      startDate: a.startDate,
      endDate: a.endDate,
      value: String(a.value || ''),
      summary: a.summary || '',
      status: a.status,
      fileName: a.fileName || '',
    });
  };

  const saveEdit = () => {
    if (!editForm.title.trim() || !editForm.otherParty.trim()) {
      showToast('Title and other party are required.', 'error');
      return;
    }
    dispatch({
      type: 'UPDATE_AGREEMENT',
      id: editingId!,
      updates: { ...editForm, value: Number(editForm.value) || 0 },
    });
    setEditingId(null);
    showToast('Agreement updated.', 'success');
  };

  const setStatus = (id: string, status: Agreement['status']) => {
    dispatch({ type: 'UPDATE_AGREEMENT', id, updates: { status } });
    showToast(`Agreement marked as ${status}.`, 'info');
  };

  const deleteAgreement = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Delete Agreement',
      message: `Are you sure you want to delete "${title}"? This cannot be undone.`,
      confirmLabel: 'Yes, Delete',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_AGREEMENT', id });
      showToast('Agreement deleted.', 'info');
    }
  };

  const filterChips = [
    { id: 'all', label: 'All', active: statusFilter === 'all', onClick: () => setStatusFilter('all') },
    { id: 'active', label: 'Active', active: statusFilter === 'active', onClick: () => setStatusFilter('active') },
    { id: 'draft', label: 'Draft', active: statusFilter === 'draft', onClick: () => setStatusFilter('draft') },
    { id: 'expired', label: 'Expired', active: statusFilter === 'expired', onClick: () => setStatusFilter('expired') },
  ];

  return (
    <div className="space-y-6">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search agreements or partners..."
        chips={filterChips}
        onClearAll={() => {
          setSearch('');
          setStatusFilter('all');
        }}
        actions={
          <Button
            variant="primary"
            onClick={() => setShowForm(v => !v)}
            iconLeft={<Icon name={showForm ? 'close' : 'plus'} size={16} />}
          >
            {showForm ? 'Cancel' : 'Add Agreement'}
          </Button>
        }
      />

      {showForm && (
        <Card className="p-6">
          <h4 className="text-base font-bold text-text mb-4">New Commercial Agreement</h4>
          <FormGrid columns={2}>
            <FormField id="agr-title" label="Agreement Title *" required>
              <Input
                id="agr-title"
                placeholder="e.g. Office Lease Agreement, Supply Contract"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </FormField>

            <FormField id="agr-party" label="Other Party / Partner *" required>
              <Input
                id="agr-party"
                placeholder="e.g. Prime Properties PLC"
                value={form.otherParty}
                onChange={e => setForm(f => ({ ...f, otherParty: e.target.value }))}
              />
            </FormField>

            <FormField id="agr-start" label="Start Date">
              <DateField
                id="agr-start"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </FormField>

            <FormField id="agr-end" label="End / Renewal Date">
              <DateField
                id="agr-end"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              />
            </FormField>

            <FormField id="agr-val" label="Agreement Value (Rs.)">
              <MoneyField
                id="agr-val"
                value={form.value}
                onChange={v => setForm(f => ({ ...f, value: String(v) }))}
                placeholder="1,200,000"
              />
            </FormField>

            <FormField id="agr-stat" label="Status">
              <Select
                id="agr-stat"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Agreement['status'] }))}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </Select>
            </FormField>

            <div className="md:col-span-2">
              <FormField id="agr-summary" label="Key Terms & Summary">
                <Input
                  id="agr-summary"
                  placeholder="Key obligations, notice period, renewal conditions..."
                  value={form.summary}
                  onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                />
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField id="agr-file" label="Attach Executed / Signed Document">
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    className="hidden"
                    onChange={e => handleFile(e, 'new')}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    iconLeft={<Icon name="upload" size={14} />}
                  >
                    Select File
                  </Button>
                  <span className="text-xs text-muted">
                    {form.fileName ? (
                      <span className="font-semibold text-text">📎 {form.fileName}</span>
                    ) : (
                      'PDF, DOCX, or scan images (max 10MB)'
                    )}
                  </span>
                </div>
              </FormField>
            </div>
          </FormGrid>

          <div className="flex items-center justify-end gap-3 pt-5 border-t border-border mt-5">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit}>
              Save Agreement
            </Button>
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No agreements found"
          helper={
            search || statusFilter !== 'all'
              ? 'No agreements match your search filters.'
              : 'Keep all your commercial contracts, office leases, and vendor agreements organised in one place.'
          }
          action={
            !showForm && (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                Add First Agreement
              </Button>
            )
          }
          className="py-12"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const days = daysUntil(a.endDate);
            const endingSoon = days > 0 && days <= 30;
            const isEditing = editingId === a.id;

            if (isEditing) {
              return (
                <Card key={a.id} className="p-6">
                  <h4 className="text-base font-bold text-text mb-4">Edit Agreement</h4>
                  <FormGrid columns={2}>
                    <FormField id="edit-agr-title" label="Title *" required>
                      <Input
                        id="edit-agr-title"
                        value={editForm.title}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      />
                    </FormField>

                    <FormField id="edit-agr-party" label="Other Party *" required>
                      <Input
                        id="edit-agr-party"
                        value={editForm.otherParty}
                        onChange={e => setEditForm(f => ({ ...f, otherParty: e.target.value }))}
                      />
                    </FormField>

                    <FormField id="edit-agr-start" label="Start Date">
                      <DateField
                        id="edit-agr-start"
                        value={editForm.startDate}
                        onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))}
                      />
                    </FormField>

                    <FormField id="edit-agr-end" label="End Date">
                      <DateField
                        id="edit-agr-end"
                        value={editForm.endDate}
                        onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))}
                      />
                    </FormField>

                    <FormField id="edit-agr-val" label="Value (Rs.)">
                      <MoneyField
                        id="edit-agr-val"
                        value={editForm.value}
                        onChange={v => setEditForm(f => ({ ...f, value: String(v) }))}
                      />
                    </FormField>

                    <FormField id="edit-agr-stat" label="Status">
                      <Select
                        id="edit-agr-stat"
                        value={editForm.status}
                        onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Agreement['status'] }))}
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                      </Select>
                    </FormField>

                    <div className="md:col-span-2">
                      <FormField id="edit-agr-summary" label="Summary">
                        <Input
                          id="edit-agr-summary"
                          value={editForm.summary}
                          onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))}
                        />
                      </FormField>
                    </div>

                    <div className="md:col-span-2">
                      <FormField id="edit-agr-file" label="Replace Signed Copy">
                        <div className="flex items-center gap-3">
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.docx"
                            className="hidden"
                            onChange={e => handleFile(e, 'edit')}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => editFileInputRef.current?.click()}
                          >
                            Replace File
                          </Button>
                          <span className="text-xs text-muted">
                            {editForm.fileName ? `📎 ${editForm.fileName}` : 'No file selected'}
                          </span>
                        </div>
                      </FormField>
                    </div>
                  </FormGrid>

                  <div className="flex items-center justify-end gap-3 pt-5 border-t border-border mt-5">
                    <Button variant="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={saveEdit}>
                      Save Changes
                    </Button>
                  </div>
                </Card>
              );
            }

            return (
              <Card key={a.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-text truncate">{a.title}</h4>
                      <Badge
                        tone={a.status === 'active' ? 'success' : a.status === 'expired' ? 'danger' : 'neutral'}
                        size="sm"
                        dot={a.status === 'active'}
                      >
                        {a.status === 'active' ? 'Active' : a.status === 'expired' ? 'Expired' : 'Draft'}
                      </Badge>
                      {endingSoon && (
                        <Badge tone="warning" size="sm">
                          Expires in {days}d
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted flex items-center gap-2 flex-wrap">
                      <span>
                        Partner: <strong className="text-text">{a.otherParty}</strong>
                      </span>
                      {a.startDate && (
                        <>
                          <span>•</span>
                          <span>From {a.startDate}</span>
                        </>
                      )}
                      {a.endDate && (
                        <>
                          <span>to {a.endDate}</span>
                        </>
                      )}
                      {a.value > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-text num">{formatRs(a.value)}</span>
                        </>
                      )}
                    </div>

                    {a.summary && (
                      <p className="text-xs text-muted leading-relaxed line-clamp-2">
                        {a.summary}
                      </p>
                    )}

                    {a.fileName && (
                      <div className="text-xs text-primary-text font-medium flex items-center gap-1.5 pt-1">
                        <Icon name="file-text" size={14} />
                        <span>{a.fileName}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap self-end sm:self-center flex-shrink-0">
                    {a.status === 'draft' && (
                      <Button variant="secondary" size="sm" onClick={() => setStatus(a.id, 'active')}>
                        Activate
                      </Button>
                    )}
                    {a.status === 'active' && (
                      <Button variant="secondary" size="sm" onClick={() => setStatus(a.id, 'expired')}>
                        Mark Expired
                      </Button>
                    )}
                    {a.status === 'expired' && (
                      <Button variant="secondary" size="sm" onClick={() => setStatus(a.id, 'active')}>
                        Reactivate
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => startEdit(a)} iconLeft={<Icon name="edit" size={14} />}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAgreement(a.id, a.title)}
                      className="!text-danger-text hover:!bg-danger-tint"
                      iconLeft={<Icon name="trash" size={14} />}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
