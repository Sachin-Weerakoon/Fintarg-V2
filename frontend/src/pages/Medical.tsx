import React, { useState, useRef } from 'react';
import { useApp, formatRs } from '../store';

const MEDICAL_TYPES = ['Consultation', 'Pharmacy', 'Lab test', 'Hospital', 'Dental', 'Specialist', 'Other'];
const MONTHS = ['2026-07', '2026-08', '2026-09'];
const MONTH_LABELS: Record<string, string> = { '2026-07': 'Jul 2026', '2026-08': 'Aug 2026', '2026-09': 'Sep 2026' };

export default function Medical() {
  const { state, dispatch } = useApp();
  const month = state.selectedMonth;
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), type: 'Consultation', amount: '', note: '' });
  const [error, setError] = useState('');
  const [remForm, setRemForm] = useState({ label: '', dueDate: '', channel: 'email' as 'email' | 'in-app' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'documents' | 'reminders'>('expenses');

  const monthExpenses = state.medicalExpenses.filter(m => m.date.startsWith(month));
  const monthTotal = monthExpenses.reduce((s, m) => s + m.amount, 0);
  const allTimeTotal = state.medicalExpenses.reduce((s, m) => s + m.amount, 0);

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) { setError('Amount must be greater than zero.'); return; }
    dispatch({ type: 'ADD_MEDICAL_EXPENSE', entry: { id: 'm_' + Date.now(), date: form.date, type: form.type, amount: Number(form.amount), note: form.note } });
    setForm({ date: new Date().toISOString().slice(0, 10), type: 'Consultation', amount: '', note: '' });
    setError('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { alert('Accepted formats: PDF, JPG, PNG, DOCX'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('File too large. Max 10 MB.'); return; }
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
    if (!remForm.label || !remForm.dueDate) { alert('Label and date required.'); return; }
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
    setRemForm({ label: '', dueDate: '', channel: 'email' });
  };

  const medicalReminders = state.reminders.filter(r => r.type === 'appointment');

  return (
    <div className="max-w-4xl mx-auto">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-5 no-print">
        {(['expenses', 'documents', 'reminders'] as const).map(t => (
          <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'expenses' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            {/* Month selector */}
            <div className="flex items-center gap-2 mb-4 no-print">
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Month:</span>
              {MONTHS.map(m => (
                <button key={m} onClick={() => dispatch({ type: 'SET_MONTH', month: m })}
                  className="tab-btn" style={{ padding: '4px 10px', fontSize: 12, minHeight: 28,
                    background: month === m ? 'var(--color-primary)' : 'transparent',
                    color: month === m ? '#fff' : 'var(--color-muted)' }}>
                  {MONTH_LABELS[m]}
                </button>
              ))}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="card text-center py-3">
                <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>This month</div>
                <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{formatRs(monthTotal)}</div>
              </div>
              <div className="card text-center py-3">
                <div className="text-xs mb-1" style={{ color: 'var(--color-muted)' }}>All time</div>
                <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{formatRs(allTimeTotal)}</div>
              </div>
            </div>

            {/* Expenses table */}
            {state.medicalExpenses.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No medical expenses recorded.</p>
              </div>
            ) : (
              <div className="card overflow-hidden p-0">
                <table className="data-table">
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Note</th><th className="text-right">Amount (Rs.)</th><th /></tr>
                  </thead>
                  <tbody>
                    {state.medicalExpenses.slice().sort((a, b) => b.date.localeCompare(a.date)).map(m => (
                      <tr key={m.id}>
                        <td style={{ color: 'var(--color-muted)' }}>{m.date}</td>
                        <td className="font-medium" style={{ color: 'var(--color-text)' }}>{m.type}</td>
                        <td style={{ color: 'var(--color-muted)' }}>{m.note}</td>
                        <td className="text-right font-medium" style={{ color: 'var(--color-text)' }}>{m.amount.toLocaleString()}</td>
                        <td className="text-center">
                          <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}
                            onClick={() => { if (confirm('Delete?')) dispatch({ type: 'DELETE_MEDICAL_EXPENSE', id: m.id }); }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add form */}
          <div className="card h-fit">
            <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Add medical expense</div>
            {error && <p className="text-xs mb-3" style={{ color: 'var(--color-danger)' }}>{error}</p>}
            <div className="space-y-3">
              <div><label className="form-label">Date</label><input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div>
                <label className="form-label">Type</label>
                <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {MEDICAL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="form-label">Amount (Rs.)</label><input className="form-input" type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="2,500" /></div>
              <div><label className="form-label">Note</label><input className="form-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="GP visit" /></div>
              <button className="btn-primary w-full" onClick={submit}>Save expense</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="max-w-2xl">
          <div className="card mb-4">
            <div className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Upload medical document</div>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>Store reports, prescriptions, and other medical files securely.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button className="btn-primary mb-2" onClick={() => fileInputRef.current?.click()}>+ Upload document</button>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Accepted: PDF, JPG, PNG, DOCX · Max 10 MB per file</p>
          </div>

          {/* Medical documents list */}
          {state.documents.filter(d => d.note === 'Medical document').length === 0 ? (
            <div className="card text-center py-8"><p className="text-sm" style={{ color: 'var(--color-muted)' }}>No medical documents uploaded.</p></div>
          ) : (
            <div className="space-y-2">
              {state.documents.filter(d => d.note === 'Medical document').map(d => (
                <div key={d.id} className="card flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{d.label}</div>
                    <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{d.fileName} · {d.uploadDate}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs" style={{ fontSize: 12, padding: '5px 12px' }}>View</button>
                    <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}
                      onClick={() => { if (confirm('Delete document?')) dispatch({ type: 'DELETE_DOCUMENT', id: d.id }); }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="max-w-2xl">
          <div className="card mb-4">
            <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Set appointment reminder</div>
            <div className="grid md:grid-cols-3 gap-3">
              <div><label className="form-label">Appointment / note</label><input className="form-input" value={remForm.label} onChange={e => setRemForm(f => ({ ...f, label: e.target.value }))} placeholder="Doctor appointment" /></div>
              <div><label className="form-label">Date</label><input className="form-input" type="date" value={remForm.dueDate} onChange={e => setRemForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
              <div>
                <label className="form-label">Channel</label>
                <select className="form-input" value={remForm.channel} onChange={e => setRemForm(f => ({ ...f, channel: e.target.value as 'email' | 'in-app' }))}>
                  <option value="in-app">In-app</option><option value="email">Email</option>
                </select>
              </div>
            </div>
            <button className="btn-primary mt-3" onClick={addReminder}>Set reminder</button>
          </div>

          {medicalReminders.length === 0 ? (
            <div className="card text-center py-8"><p className="text-sm" style={{ color: 'var(--color-muted)' }}>No reminders set.</p></div>
          ) : (
            <div className="space-y-2">
              {medicalReminders.map(r => {
                const daysAway = Math.round((new Date(r.dueDate).getTime() - Date.now()) / 86400000);
                return (
                  <div key={r.id} className="card flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{r.label}</div>
                      <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                        {r.dueDate} · {r.channel}
                        {daysAway >= 0 && daysAway <= 7 && <span className="ml-2 badge-warning">In {daysAway}d</span>}
                        {daysAway < 0 && <span className="ml-2 badge-muted">Past</span>}
                      </div>
                    </div>
                    <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}
                      onClick={() => dispatch({ type: 'DELETE_REMINDER', id: r.id })}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
