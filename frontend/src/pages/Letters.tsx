import React, { useState } from 'react';
import { useApp } from '../store';
import type { Letter } from '../types';

type Template = 'bank' | 'offer' | 'general';

function generateBody(
  template: Template,
  mode: 'personal' | 'business',
  profile: ReturnType<typeof useApp>['state']['profile'],
  company: ReturnType<typeof useApp>['state']['companies'][0] | null,
  addressedTo: string,
  purpose: string,
  accountNumber: string,
): string {
  const name = mode === 'business' && company ? company.name : profile.name || 'Your Name';
  const address = mode === 'business' && company ? company.address : profile.address || 'Address, City';
  const contact = mode === 'business' && company ? company.contact : profile.mobile || '';
  const date = new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' });
  const accNum = accountNumber || profile.accountNumber || '— — — —';

  if (template === 'bank') {
    return `${name}
${address}${contact ? '\n' + contact : ''}

${date}

${addressedTo || 'The Manager'}
${mode === 'personal' ? (profile.bankName || 'Bank') : 'Bank'}

Dear Sir/Madam,

RE: ${purpose || 'Account Enquiry'}

I${mode === 'business' ? ', on behalf of ' + name + ',' : ''} am writing regarding account number ${accNum}. I kindly request your assistance with the above matter.

Please process this at your earliest convenience and do not hesitate to contact us should you require further information.

Yours faithfully,

${name}`;
  }

  if (template === 'offer') {
    return `${name}
${address}

${date}

${addressedTo || 'Sir/Madam'}

Dear Sir/Madam,

RE: ${purpose || 'Offer / Proposal'}

We are pleased to submit this proposal for your consideration. We believe this arrangement would be mutually beneficial and look forward to a positive response.

Please review the enclosed terms and revert at your earliest convenience.

Yours sincerely,

${name}`;
  }

  return `${name}
${address}

${date}

${addressedTo || 'Sir/Madam'}

Dear Sir/Madam,

${purpose || 'Please find this letter for your reference.'}

We trust this meets with your satisfaction. Please contact us if you require any further information.

Yours faithfully,

${name}`;
}

export default function Letters() {
  const { state, dispatch } = useApp();
  const { profile } = state;
  const isBusiness = profile.plan === 'business';

  const [mode, setMode] = useState<'personal' | 'business'>('personal');
  const [template, setTemplate] = useState<Template>('bank');
  const [selectedCompanyId, setSelectedCompanyId] = useState(state.companies[0]?.id || '');
  const [form, setForm] = useState({ addressedTo: '', accountNumber: '', purpose: '' });
  const [generated, setGenerated] = useState('');
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [saved, setSaved] = useState(false);

  const selectedCompany = state.companies.find(c => c.id === selectedCompanyId) || null;

  const missingFields: string[] = [];
  if (!profile.name) missingFields.push('name');
  if (!profile.address) missingFields.push('address');
  if (template === 'bank' && !profile.accountNumber && !form.accountNumber) missingFields.push('account number');

  const generate = () => {
    const body = generateBody(template, mode, profile, selectedCompany, form.addressedTo, form.purpose, form.accountNumber);
    setGenerated(body);
    setEditBody(body);
    setEditing(false);
    setSaved(false);
  };

  const save = () => {
    const finalBody = editing ? editBody : generated;
    if (!finalBody) return;
    dispatch({
      type: 'ADD_LETTER',
      entry: {
        id: 'lt_' + Date.now(),
        type: template,
        mode,
        date: new Date().toISOString().slice(0, 10),
        addressedTo: form.addressedTo,
        purpose: form.purpose,
        body: finalBody,
        companyId: mode === 'business' ? selectedCompanyId : undefined,
      },
    });
    setSaved(true);
  };

  const downloadPDF = () => {
    const content = editing ? editBody : generated;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Letter</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; margin: 60px; line-height: 1.8; color: #000; }
        pre { font-family: inherit; white-space: pre-wrap; }
      </style></head>
      <body><pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid md:grid-cols-5 gap-6">
        {/* Form panel */}
        <div className="md:col-span-2">
          {/* Mode toggle */}
          {isBusiness && (
            <div className="flex gap-2 mb-5">
              <button className={`tab-btn${mode === 'personal' ? ' active' : ''}`} onClick={() => setMode('personal')}>Personal</button>
              <button className={`tab-btn${mode === 'business' ? ' active' : ''}`} onClick={() => setMode('business')}>Business</button>
            </div>
          )}

          {missingFields.length > 0 && (
            <div className="alert-warning mb-4 text-xs">
              ⚠ Missing: <strong>{missingFields.join(', ')}</strong>.{' '}
              <button style={{ color: 'var(--color-primary)', fontWeight: 600 }}
                onClick={() => dispatch({ type: 'SET_PAGE', page: 'settings' })}>
                Go to Settings →
              </button>
            </div>
          )}

          <div className="card space-y-3">
            <div>
              <label className="form-label">Template</label>
              <select className="form-input" value={template} onChange={e => setTemplate(e.target.value as Template)}>
                <option value="bank">Bank letter</option>
                <option value="offer">Offer letter</option>
                <option value="general">General letter</option>
              </select>
            </div>

            {mode === 'business' && state.companies.length > 0 && (
              <div>
                <label className="form-label">Company</label>
                <select className="form-input" value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)}>
                  {state.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="form-label">Addressed to</label>
              <input className="form-input" value={form.addressedTo} onChange={e => setForm(f => ({ ...f, addressedTo: e.target.value }))} placeholder="The Manager, Bank" />
            </div>

            {template === 'bank' && (
              <div>
                <label className="form-label">Account number</label>
                <input className="form-input" value={form.accountNumber || profile.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="0012 3456 789" />
              </div>
            )}

            <div>
              <label className="form-label">Purpose / Subject</label>
              <input className="form-input" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Loan settlement request" />
            </div>

            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Details are pre-filled from your {mode === 'business' ? 'company' : 'profile'}.</p>
            <button className="btn-primary w-full" onClick={generate}>Generate letter</button>
          </div>

          {/* Letter history */}
          {state.letters.length > 0 && (
            <div className="mt-5">
              <div className="font-semibold text-xs mb-2" style={{ color: 'var(--color-muted)' }}>Letter history</div>
              <div className="space-y-1.5">
                {state.letters.slice().reverse().map(l => (
                  <div key={l.id} className="card py-2 px-3 flex items-center justify-between gap-2">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => { setGenerated(l.body); setEditBody(l.body); setEditing(false); setSaved(true); }}
                    >
                      <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{l.type} · {l.mode}</div>
                      <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{l.date} · {l.addressedTo || '—'}</div>
                    </div>
                    <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }}
                      onClick={() => { if (confirm('Delete letter?')) dispatch({ type: 'DELETE_LETTER', id: l.id }); }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div className="md:col-span-3">
          {generated ? (
            <div className="card flex flex-col" style={{ minHeight: 400 }}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2 no-print">
                <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  Letter preview
                  {saved && <span className="ml-2 badge-success">Saved</span>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn-ghost text-xs" onClick={() => setEditing(v => !v)}>
                    {editing ? '👁 Preview' : '✎ Edit text'}
                  </button>
                  <button className="btn-secondary text-xs" style={{ fontSize: 13, padding: '6px 14px' }} onClick={save} disabled={saved}>
                    {saved ? 'Saved ✓' : 'Save'}
                  </button>
                  <button className="btn-primary text-xs" style={{ fontSize: 13, padding: '6px 14px' }} onClick={downloadPDF}>
                    Download PDF
                  </button>
                </div>
              </div>

              {editing ? (
                <textarea
                  className="form-input flex-1 font-mono text-sm"
                  style={{ resize: 'vertical', minHeight: 360 }}
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                />
              ) : (
                <div
                  className="flex-1 rounded-lg p-6 text-sm whitespace-pre-wrap leading-relaxed"
                  style={{ background: '#fafafa', border: '1px solid var(--color-border)', color: 'var(--color-text)', minHeight: 360, fontFamily: 'inherit' }}
                >
                  {editing ? editBody : generated}
                </div>
              )}
            </div>
          ) : (
            <div className="card flex items-center justify-center" style={{ minHeight: 300 }}>
              <div className="text-center">
                <div className="text-4xl mb-3">✉</div>
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Fill the form and click "Generate letter"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
