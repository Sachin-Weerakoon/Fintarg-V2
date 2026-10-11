'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useApp, formatRs } from '@/store';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';

const MEDICAL_TYPES = ['Consultation', 'Pharmacy', 'Lab test', 'Hospital', 'Dental', 'Specialist', 'Other'];
const MONTHS = ['2026-07', '2026-08', '2026-09'];
const MONTH_LABELS: Record<string, string> = { '2026-07': 'Jul 2026', '2026-08': 'Aug 2026', '2026-09': 'Sep 2026' };

export default function MedicalClient() {
  const { state, dispatch } = useApp();
  const confirm = useConfirm();
  const toast = useToast();
  const month = state.selectedMonth;
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), type: 'Consultation', amount: '', note: '' });
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [remForm, setRemForm] = useState({ label: '', dueDate: '', channel: 'email' as 'email' | 'in-app' });
  const [remError, setRemError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'documents' | 'reminders'>('expenses');
  const handleDeleteExpense = async (id: string, type: string) => {
    const ok = await confirm({
      title: 'Delete Medical Expense',
      message: `Are you sure you want to delete this ${type} expense record?`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_MEDICAL_EXPENSE', id });
      toast.success('Medical expense deleted');
    }
  };

  const handleDeleteDoc = async (id: string, label: string) => {
    const ok = await confirm({
      title: 'Delete Document',
      message: `Are you sure you want to delete medical document "${label}"?`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_DOCUMENT', id });
      toast.success('Medical document removed');
    }
  };

  const handleDeleteReminder = async (id: string, label: string) => {
    const ok = await confirm({
      title: 'Delete Reminder',
      message: `Are you sure you want to delete reminder "${label}"?`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_REMINDER', id });
      toast.success('Reminder deleted');
    }
  };

  const monthExpenses = state.medicalExpenses.filter(m => m.date.startsWith(month));
  const monthTotal = monthExpenses.reduce((s, m) => s + m.amount, 0);
  const allTimeTotal = state.medicalExpenses.reduce((s, m) => s + m.amount, 0);

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    dispatch({
      type: 'ADD_MEDICAL_EXPENSE',
      entry: { id: 'm_' + Date.now(), date: form.date, type: form.type, amount: Number(form.amount), note: form.note },
    });
    toast.success('Medical expense recorded');
    setForm({ date: new Date().toISOString().slice(0, 10), type: 'Consultation', amount: '', note: '' });
    setError('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      setFileError('Accepted formats: PDF, JPG, PNG, DOCX');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File too large. Max 10 MB.');
      return;
    }
    dispatch({
      type: 'ADD_DOCUMENT',
      entry: {
        id: 'med_' + Date.now(),
        type: 'other',
        label: file.name.replace(/\.[^.]+$/, ''),
        uploadDate: new Date().toISOString().slice(0, 10),
        note: 'Medical document',
        fileName: file.name,
      },
    });
    e.target.value = '';
  };

  const addReminder = () => {
    if (!remForm.label || !remForm.dueDate) {
      setRemError('Label and date are required.');
      return;
    }
    dispatch({
      type: 'ADD_REMINDER',
      entry: {
        id: 'rem_' + Date.now(),
        type: 'appointment',
        relatedId: '',
        label: remForm.label,
        dueDate: remForm.dueDate,
        channel: remForm.channel,
        status: 'pending',
      },
    });
    toast.success('Medical reminder added');
    setRemForm({ label: '', dueDate: '', channel: 'email' });
    setRemError('');
  };

  const medicalReminders = state.reminders.filter(r => r.type === 'appointment');

  return (
    <PageContainer width="narrow">
      <PageHeader
        title="Medical Ledger & Appointments"
        description="Track medical costs, prescription documents, and clinic reminders."
        actions={
          <Link href="/advanced">
            <Button variant="secondary" size="sm" iconLeft={<Icon name="arrow-left" size={14} />}>
              Advanced Hub
            </Button>
          </Link>
        }
      />

      {/* Sub-tabs */}
      <SegmentedTabs
        options={[
          { id: 'expenses', label: 'Expenses' },
          { id: 'documents', label: 'Documents' },
          { id: 'reminders', label: 'Reminders' },
        ]}
        value={activeTab}
        onChange={v => setActiveTab(v as any)}
      />

      {activeTab === 'expenses' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {/* Month selector */}
            <div className="flex items-center gap-2 no-print">
              <span className="text-xs font-semibold text-muted">Month:</span>
              <SegmentedTabs
                size="sm"
                options={MONTHS.map(m => ({ id: m, label: MONTH_LABELS[m] || m }))}
                value={month}
                onChange={m => dispatch({ type: 'SET_MONTH', month: m })}
              />
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="text-center p-3">
                <div className="text-xs text-muted mb-0.5">This month</div>
                <div className="font-bold text-sm text-text num">{formatRs(monthTotal)}</div>
              </Card>
              <Card className="text-center p-3">
                <div className="text-xs text-muted mb-0.5">All time</div>
                <div className="font-bold text-sm text-text num">{formatRs(allTimeTotal)}</div>
              </Card>
            </div>

            {/* Expenses table */}
            {state.medicalExpenses.length === 0 ? (
              <EmptyState
                icon={<Icon name="heart" size={24} />}
                title="No medical expenses recorded"
                helper="Log doctor consultations, lab tests, and pharmacy bills."
              />
            ) : (
              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Note</th>
                        <th className="text-right">Amount</th>
                        <th className="w-16 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.medicalExpenses
                        .slice()
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map(m => (
                          <tr key={m.id}>
                            <td className="text-muted num">{m.date}</td>
                            <td className="font-medium text-text">{m.type}</td>
                            <td className="text-muted">{m.note || '—'}</td>
                            <td className="text-right font-medium text-text num">{formatRs(m.amount)}</td>
                            <td className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-danger-text hover:text-danger-text !p-1"
                                onClick={() => handleDeleteExpense(m.id, m.type)}
                                aria-label="Delete medical expense"
                              >
                                <Icon name="trash" size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          {/* Add form */}
          <Card className="p-5 h-fit">
            <h3 className="font-semibold text-sm mb-4 text-text">Add medical expense</h3>
            <div className="space-y-3.5">
              <Field id="med-date" label="Date">
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </Field>
              <Field id="med-type" label="Type">
                <Select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                >
                  {MEDICAL_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field id="med-amount" label="Amount (Rs.)" error={error}>
                <Input
                  type="number"
                  min="1"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="2,500"
                />
              </Field>
              <Field id="med-note" label="Note">
                <Input
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="e.g. GP visit, blood panel"
                />
              </Field>
              <Button variant="primary" className="w-full pt-1" onClick={submit}>
                Save Expense
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="max-w-2xl space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-1 text-text">Upload medical document</h3>
            <p className="text-xs text-muted mb-4">Store reports, prescriptions, and lab tests securely.</p>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
            {fileError && <p className="text-xs text-danger-text mb-3">{fileError}</p>}
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Icon name="upload" size={14} />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Document
            </Button>
            <p className="text-[11px] text-muted mt-2">Accepted: PDF, JPG, PNG, DOCX · Max 10 MB per file</p>
          </Card>

          {/* Medical documents list */}
          {state.documents.filter(d => d.note === 'Medical document').length === 0 ? (
            <EmptyState
              title="No medical documents uploaded"
              helper="Securely upload your first clinic report or prescription."
            />
          ) : (
            <div className="space-y-2">
              {state.documents
                .filter(d => d.note === 'Medical document')
                .map(d => (
                  <Card key={d.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-text">{d.label}</div>
                      <div className="text-xs text-muted mt-0.5">{d.fileName} · {d.uploadDate}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-text hover:text-danger-text !p-1.5"
                        onClick={() => handleDeleteDoc(d.id, d.label)}
                        aria-label="Delete document"
                      >
                        <Icon name="trash" size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="max-w-2xl space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-4 text-text">Set appointment reminder</h3>
            {remError && <p className="text-xs text-danger-text mb-3">{remError}</p>}
            <div className="grid md:grid-cols-3 gap-3">
              <Field id="rem-label" label="Appointment / Note">
                <Input
                  value={remForm.label}
                  onChange={e => setRemForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Doctor appointment"
                />
              </Field>
              <Field id="rem-date" label="Date">
                <Input
                  type="date"
                  value={remForm.dueDate}
                  onChange={e => setRemForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </Field>
              <Field id="rem-channel" label="Channel">
                <Select
                  value={remForm.channel}
                  onChange={e => setRemForm(f => ({ ...f, channel: e.target.value as any }))}
                >
                  <option value="in-app">In-app</option>
                  <option value="email">Email</option>
                </Select>
              </Field>
            </div>
            <Button variant="primary" size="sm" className="mt-4" onClick={addReminder}>
              Set Reminder
            </Button>
          </Card>

          {medicalReminders.length === 0 ? (
            <EmptyState
              title="No reminders set"
              helper="Add clinical follow-ups or checkup reminders."
            />
          ) : (
            <div className="space-y-2">
              {medicalReminders.map(r => {
                const daysAway = Math.round((new Date(r.dueDate).getTime() - Date.now()) / 86400000);
                return (
                  <Card key={r.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-text">{r.label}</div>
                      <div className="text-xs text-muted mt-0.5 flex items-center gap-2">
                        <span className="num">{r.dueDate}</span>
                        <span>·</span>
                        <span>{r.channel}</span>
                        {daysAway >= 0 && daysAway <= 7 && <Badge tone="warning" size="sm">In {daysAway}d</Badge>}
                        {daysAway < 0 && <Badge tone="neutral" size="sm">Past</Badge>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger-text hover:text-danger-text !p-1.5"
                      onClick={() => handleDeleteReminder(r.id, r.label)}
                      aria-label="Delete reminder"
                    >
                      <Icon name="trash" size={14} />
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}


    </PageContainer>
  );
}
