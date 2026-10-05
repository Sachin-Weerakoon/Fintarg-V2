import React, { useState, useRef } from 'react';
import { useApp } from '../store';
import type { Document } from '../types';

type Tab = 'appearance' | 'profile' | 'contacts' | 'documents' | 'reminders' | 'plan';

const THEME_COLORS = ['#0FA3B1', '#14284B', '#2E9E6B', '#7C3AED', '#E91E8C', '#F2A900'];

export default function Settings() {
  const [tab, setTab] = useState<Tab>('appearance');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid md:grid-cols-4 gap-6">
        {/* Settings nav */}
        <div className="md:col-span-1">
          <div className="card p-2 space-y-1">
            {(['appearance', 'profile', 'contacts', 'documents', 'reminders', 'plan'] as Tab[]).map(t => (
              <button
                key={t}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: tab === t ? 'var(--color-primary-tint)' : 'transparent',
                  color: tab === t ? 'var(--color-primary)' : 'var(--color-muted)',
                }}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="md:col-span-3">
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'profile' && <ProfileTab />}
          {tab === 'contacts' && <ContactsTab />}
          {tab === 'documents' && <DocumentsTab />}
          {tab === 'reminders' && <RemindersTab />}
          {tab === 'plan' && <PlanTab />}
        </div>
      </div>
    </div>
  );
}

// Default light-mode color values (mirrors index.css)
const COLOR_DEFAULTS = {
  colorText: '#222B38',
  colorMuted: '#5B6573',
  colorBg: '#F4F8FA',
  colorSurface: '#FFFFFF',
};

function ColorPicker({ label, description, value, defaultValue, onChange, onReset }: {
  label: string; description: string; value: string; defaultValue: string;
  onChange: (v: string) => void; onReset: () => void;
}) {
  const effective = value || defaultValue;
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex-1 min-w-0 mr-4">
        <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{description}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* Swatch + native picker */}
        <label className="relative cursor-pointer group" title={`Pick ${label}`}>
          <div
            className="w-10 h-10 rounded-xl border-2 transition-all shadow-sm group-hover:scale-105"
            style={{
              background: effective,
              borderColor: value ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          />
          <input
            type="color"
            value={effective}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            style={{ fontSize: 0 }}
          />
        </label>
        {/* Hex display */}
        <input
          className="w-24 text-xs font-mono rounded-lg px-2 py-1.5 border"
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}
          value={effective}
          onChange={e => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          maxLength={7}
          spellCheck={false}
        />
        {/* Reset */}
        {value && (
          <button
            className="text-xs px-2 py-1 rounded-lg transition-colors"
            style={{ color: 'var(--color-muted)', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            onClick={onReset}
            title="Reset to default"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  );
}

function AppearanceTab() {
  const { state, dispatch } = useApp();
  const { profile } = state;
  const update = (v: Partial<typeof profile>) => dispatch({ type: 'UPDATE_PROFILE', profile: v });

  const resetAllColors = () => update({ colorText: '', colorMuted: '', colorBg: '', colorSurface: '' });
  const hasCustomColors = profile.colorText || profile.colorMuted || profile.colorBg || profile.colorSurface;

  // Preview uses effective values
  const previewBg = profile.colorBg || COLOR_DEFAULTS.colorBg;
  const previewSurface = profile.colorSurface || COLOR_DEFAULTS.colorSurface;
  const previewText = profile.colorText || COLOR_DEFAULTS.colorText;
  const previewMuted = profile.colorMuted || COLOR_DEFAULTS.colorMuted;

  return (
    <div className="space-y-4">
      {/* Accent / Primary color */}
      <div className="card">
        <div className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>Accent colour</div>
        <div className="flex gap-3 flex-wrap mb-4">
          {THEME_COLORS.map(c => (
            <button
              key={c}
              onClick={() => update({ themeColor: c })}
              className="w-10 h-10 rounded-full border-2 transition-all"
              style={{
                background: c,
                borderColor: profile.themeColor === c ? 'var(--color-text)' : 'transparent',
                boxShadow: profile.themeColor === c ? '0 0 0 2px white, 0 0 0 4px ' + c : 'none',
              }}
            />
          ))}
        </div>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Used for buttons, links, progress bars, and highlights.</p>
      </div>

      {/* Custom color palette */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Colour palette</div>
          {hasCustomColors && (
            <button className="text-xs" style={{ color: 'var(--color-muted)' }} onClick={resetAllColors}>Reset all</button>
          )}
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--color-muted)' }}>Click a swatch or enter a hex code. Applies in light mode.</p>

        <ColorPicker
          label="Primary text"
          description="Headings, labels, values"
          value={profile.colorText}
          defaultValue={COLOR_DEFAULTS.colorText}
          onChange={v => update({ colorText: v })}
          onReset={() => update({ colorText: '' })}
        />
        <ColorPicker
          label="Secondary text"
          description="Hints, captions, dates"
          value={profile.colorMuted}
          defaultValue={COLOR_DEFAULTS.colorMuted}
          onChange={v => update({ colorMuted: v })}
          onReset={() => update({ colorMuted: '' })}
        />
        <ColorPicker
          label="Page background"
          description="The overall page fill"
          value={profile.colorBg}
          defaultValue={COLOR_DEFAULTS.colorBg}
          onChange={v => update({ colorBg: v })}
          onReset={() => update({ colorBg: '' })}
        />
        <ColorPicker
          label="Card / panel colour"
          description="Cards, modals, text boxes"
          value={profile.colorSurface}
          defaultValue={COLOR_DEFAULTS.colorSurface}
          onChange={v => update({ colorSurface: v })}
          onReset={() => update({ colorSurface: '' })}
        />
      </div>

      {/* Dark mode + text size */}
      <div className="card space-y-4">
        <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Display</div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Dark mode</div>
            <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Easier on the eyes at night (overrides custom colours)</div>
          </div>
          <button
            onClick={() => update({ darkMode: !profile.darkMode })}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: profile.darkMode ? 'var(--color-primary)' : '#d1d5db' }}
          >
            <span
              className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform"
              style={{ transform: profile.darkMode ? 'translateX(24px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        <div>
          <div className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>Text size</div>
          <div className="flex gap-2">
            {(['small', 'medium', 'large'] as const).map(s => (
              <button
                key={s}
                onClick={() => update({ textSize: s })}
                className="tab-btn"
                style={{
                  background: profile.textSize === s ? 'var(--color-primary)' : 'var(--color-bg)',
                  color: profile.textSize === s ? '#fff' : 'var(--color-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="card">
        <div className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Live preview</div>
        <div className="rounded-xl p-4 border" style={{ background: previewBg, borderColor: 'var(--color-border)' }}>
          {/* Mini card inside */}
          <div className="rounded-lg p-3 mb-3" style={{ background: previewSurface, border: '1px solid rgba(0,0,0,0.07)' }}>
            <div className="text-xs mb-1" style={{ color: previewMuted }}>Net position · September 2026</div>
            <div className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>Rs. 45,000</div>
            <div className="text-xs mt-0.5 font-medium" style={{ color: 'var(--color-success)' }}>On track</div>
          </div>
          {/* Row of mini cards */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[['Income', 'Rs. 50,000'], ['Outflow', 'Rs. 5,000'], ['Savings', 'Rs. 30,000']].map(([lbl, val]) => (
              <div key={lbl} className="rounded-lg p-2.5" style={{ background: previewSurface, border: '1px solid rgba(0,0,0,0.07)' }}>
                <div className="text-xs mb-0.5" style={{ color: previewMuted }}>{lbl}</div>
                <div className="text-xs font-bold" style={{ color: previewText }}>{val}</div>
              </div>
            ))}
          </div>
          {/* Accent button */}
          <button className="btn-primary text-xs" style={{ fontSize: 12 }}>Primary action</button>
          <span className="ml-2 text-xs" style={{ color: previewMuted }}>Secondary text example</span>
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { state, dispatch } = useApp();
  const { profile } = state;
  const [form, setForm] = useState({ ...profile });

  const save = () => dispatch({ type: 'UPDATE_PROFILE', profile: form });

  return (
    <div className="card">
      <div className="font-semibold text-base mb-5" style={{ color: 'var(--color-text)' }}>Profile</div>
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="form-label">Full name</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div><label className="form-label">Mobile</label><input className="form-input" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="07X XXX XXXX" /></div>
        <div><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div><label className="form-label">Date of birth</label><input className="form-input" type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} /></div>
        <div className="md:col-span-2"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="No. 1, Main Street, Colombo" /></div>
        <div><label className="form-label">NIC number</label><input className="form-input" value={form.nicNumber} onChange={e => setForm(f => ({ ...f, nicNumber: e.target.value }))} placeholder="200012345678" /></div>
        <div><label className="form-label">Portfolio link</label><input className="form-input" value={form.portfolioLink} onChange={e => setForm(f => ({ ...f, portfolioLink: e.target.value }))} /></div>
        <div className="border-t pt-4 md:col-span-2" style={{ borderColor: '#e0e7ef' }}>
          <div className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Bank details (for letters)</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="form-label">Bank name</label><input className="form-input" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} /></div>
            <div><label className="form-label">Branch</label><input className="form-input" value={form.bankBranch} onChange={e => setForm(f => ({ ...f, bankBranch: e.target.value }))} /></div>
            <div><label className="form-label">Account name</label><input className="form-input" value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))} /></div>
            <div><label className="form-label">Account number</label><input className="form-input" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} /></div>
          </div>
        </div>
      </div>
      <button className="btn-primary mt-5" onClick={save}>Save profile</button>
    </div>
  );
}

function ContactsTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ name: '', relationship: '', number: '' });
  const [error, setError] = useState('');

  const addContact = () => {
    if (!form.name || !form.number) { setError('Name and number required.'); return; }
    const contacts = [...state.profile.contacts, { id: 'c_' + Date.now(), ...form }];
    dispatch({ type: 'UPDATE_PROFILE', profile: { contacts } });
    setForm({ name: '', relationship: '', number: '' });
    setError('');
  };

  const removeContact = (id: string) => {
    const contacts = state.profile.contacts.filter(c => c.id !== id);
    dispatch({ type: 'UPDATE_PROFILE', profile: { contacts } });
  };

  return (
    <div className="card">
      <div className="font-semibold text-base mb-4" style={{ color: 'var(--color-text)' }}>Contacts</div>

      {state.profile.contacts.length === 0 ? (
        <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>No contacts saved yet.</p>
      ) : (
        <div className="space-y-2 mb-5">
          {state.profile.contacts.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg)' }}>
              <div>
                <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{c.name}</div>
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{c.relationship} · {c.number}</div>
              </div>
              <button onClick={() => removeContact(c.id)} style={{ color: 'var(--color-danger)', fontSize: 12 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-4" style={{ borderColor: '#e0e7ef' }}>
        <div className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Add contact</div>
        {error && <p className="text-xs mb-2" style={{ color: 'var(--color-danger)' }}>{error}</p>}
        <div className="grid md:grid-cols-3 gap-3">
          <div><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="form-label">Relationship</label><input className="form-input" value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} placeholder="Parent" /></div>
          <div><label className="form-label">Number</label><input className="form-input" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="07X XXX XXXX" /></div>
        </div>
        <button className="btn-primary mt-3" onClick={addContact}>Add contact</button>
      </div>
    </div>
  );
}

const DOC_TYPES: { value: Document['type']; label: string }[] = [
  { value: 'profile-picture', label: 'Profile picture' },
  { value: 'cv', label: 'CV' },
  { value: 'nic-front', label: 'NIC Front' },
  { value: 'nic-back', label: 'NIC Back' },
  { value: 'bank', label: 'Bank document' },
  { value: 'other', label: 'Other' },
];

function DocumentsTab() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ type: 'cv' as Document['type'], label: '', note: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { alert('Accepted: PDF, JPG, PNG, DOCX'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Max file size is 10 MB'); return; }
    dispatch({
      type: 'ADD_DOCUMENT',
      entry: {
        id: 'doc_' + Date.now(),
        type: form.type,
        label: form.label || DOC_TYPES.find(d => d.value === form.type)?.label || file.name,
        uploadDate: new Date().toISOString().slice(0, 10),
        note: form.note,
        fileName: file.name,
      },
    });
    setForm({ type: 'cv', label: '', note: '' });
    e.target.value = '';
  };

  const vaultDocs = state.documents.filter(d => d.note !== 'Medical document');

  return (
    <div className="card">
      <div className="font-semibold text-base mb-4" style={{ color: 'var(--color-text)' }}>Document Vault</div>

      {vaultDocs.length === 0 ? (
        <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2 mb-5">
          {vaultDocs.map(d => (
            <div key={d.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg)' }}>
              <div>
                <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{d.label}</div>
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>{d.type} · {d.uploadDate}{d.note ? ` · ${d.note}` : ''} · {d.fileName}</div>
              </div>
              <div className="flex gap-3">
                <button className="text-xs" style={{ color: 'var(--color-primary)' }}>View</button>
                <button onClick={() => { if (confirm('Delete document?')) dispatch({ type: 'DELETE_DOCUMENT', id: d.id }); }} style={{ color: 'var(--color-danger)', fontSize: 12 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-4" style={{ borderColor: '#e0e7ef' }}>
        <div className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>Upload document</div>
        <div className="grid md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="form-label">Type</label>
            <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Document['type'] }))}>
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div><label className="form-label">Custom label</label><input className="form-input" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} /></div>
          <div><label className="form-label">Note</label><input className="form-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" className="hidden" onChange={handleFile} />
        <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>Choose & upload file</button>
        <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>Accepted: PDF, JPG, PNG, DOCX · Max 10 MB per file</p>
      </div>
    </div>
  );
}

function RemindersTab() {
  const { state, dispatch } = useApp();
  const reminders = state.reminders;

  const typeLabel: Record<string, string> = { finance: 'Finance payment', loan: 'Loan', pawn: 'Pawn interest', agreement: 'Agreement', appointment: 'Appointment', custom: 'Custom' };

  return (
    <div className="card">
      <div className="font-semibold text-base mb-4" style={{ color: 'var(--color-text)' }}>Reminders</div>
      <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>
        Manage all scheduled reminders. Appointment reminders can be added from the Medical section.
      </p>

      {reminders.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No reminders set. Add appointment reminders in Medical → Reminders.</p>
      ) : (
        <div className="space-y-2">
          {reminders.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(r => {
            const daysAway = Math.round((new Date(r.dueDate).getTime() - Date.now()) / 86400000);
            return (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg gap-3" style={{ background: 'var(--color-bg)' }}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{r.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                    {typeLabel[r.type] || r.type} · {r.dueDate} · {r.channel}
                    {daysAway >= 0 && daysAway <= 7 && <span className="ml-2 badge-warning">In {daysAway}d</span>}
                    {daysAway < 0 && <span className="ml-2 badge-muted">Past</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={r.status === 'pending' ? 'badge-success' : r.status === 'dismissed' ? 'badge-muted' : 'badge-muted'}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>
                  {r.status === 'pending' && (
                    <button className="btn-ghost text-xs" style={{ fontSize: 11 }} onClick={() => dispatch({ type: 'UPDATE_REMINDER', id: r.id, status: 'dismissed' })}>Dismiss</button>
                  )}
                  <button className="btn-ghost text-xs" style={{ color: 'var(--color-danger)' }} onClick={() => dispatch({ type: 'DELETE_REMINDER', id: r.id })}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlanTab() {
  const { state, dispatch } = useApp();
  const labels = { salary: 'Salary', business: 'Business', both: 'Job + Business' };
  const setMode = (workMode: 'salary' | 'business' | 'both') => {
    dispatch({ type: 'UPDATE_PROFILE', profile: { workMode, plan: workMode === 'salary' ? 'basic' : 'business' } });
  };

  return (
    <div className="card">
      <div className="font-semibold text-base mb-1" style={{ color: 'var(--color-text)' }}>Work profile</div>
      <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>Choose how you earn so Advanced Features can keep each income source clear.</p>
      <div className="p-4 rounded-xl mb-5" style={{ background: 'var(--color-primary-tint)' }}>
        <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>Current profile: {labels[state.profile.workMode]}</div>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Your existing records stay available when you change this setting.
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {(['salary', 'business', 'both'] as const).map(mode => (
          <button key={mode} className={state.profile.workMode === mode ? 'btn-primary' : 'btn-secondary'} onClick={() => setMode(mode)}>
            {labels[mode]}
          </button>
        ))}
      </div>
      <div className="mt-5 pt-5 border-t" style={{ borderColor: '#e0e7ef' }}>
        <div className="font-semibold text-sm mb-2" style={{ color: 'var(--color-danger)' }}>Danger zone</div>
        <button className="btn-danger text-sm" onClick={() => { if (confirm('Delete your account and all data? This cannot be undone.')) alert('Account deletion requested.'); }}>Delete my account</button>
      </div>
    </div>
  );
}
