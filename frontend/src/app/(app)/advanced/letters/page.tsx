'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/store';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Icon } from '@/components/ui/Icon';
import ConfirmDialog from '@/components/ConfirmDialog';

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

export default function LettersClient() {
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const latestId = state.letters.length > 0 ? state.letters[state.letters.length - 1].id : null;

  return (
    <PageContainer width="narrow">
      <PageHeader
        title="Formal Letter Generator"
        description="Draft, customize, and export Sri Lankan legal and banking correspondence."
        actions={
          <Link href="/advanced">
            <Button variant="secondary" size="sm" iconLeft={<Icon name="arrow-left" size={14} />}>
              Advanced Hub
            </Button>
          </Link>
        }
      />

      <div className="grid md:grid-cols-5 gap-6">
        {/* Form panel */}
        <div className="md:col-span-2 space-y-4">
          {/* Mode toggle */}
          {isBusiness && (
            <SegmentedTabs
              options={[
                { id: 'personal', label: 'Personal' },
                { id: 'business', label: 'Business' },
              ]}
              value={mode}
              onChange={v => setMode(v as any)}
            />
          )}

          {missingFields.length > 0 && (
            <div className="p-3.5 rounded-xl border border-warning-solid/30 bg-warning-tint/30 text-warning-text text-xs">
              <span className="font-semibold">Notice:</span> Missing {missingFields.join(', ')} in your profile.{' '}
              <Link href="/settings" className="font-semibold underline text-primary-text">
                Settings →
              </Link>
            </div>
          )}

          <Card className="p-5 space-y-3.5">
            <Field id="letter-template" label="Template">
              <Select value={template} onChange={e => setTemplate(e.target.value as Template)}>
                <option value="bank">Bank letter</option>
                <option value="offer">Offer letter</option>
                <option value="general">General letter</option>
              </Select>
            </Field>

            {mode === 'business' && state.companies.length > 0 && (
              <Field id="letter-company" label="Company">
                <Select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)}>
                  {state.companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
            )}

            <Field id="letter-addressee" label="Addressed to">
              <Input
                value={form.addressedTo}
                onChange={e => setForm(f => ({ ...f, addressedTo: e.target.value }))}
                placeholder="The Manager, Bank"
              />
            </Field>

            {template === 'bank' && (
              <Field id="letter-account" label="Account number">
                <Input
                  value={form.accountNumber || profile.accountNumber}
                  onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="0012 3456 789"
                />
              </Field>
            )}

            <Field id="letter-purpose" label="Purpose / Subject">
              <Input
                value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder="Loan settlement request"
              />
            </Field>

            <p className="text-xs text-muted">
              Sender details are auto-populated from your {mode === 'business' ? 'company' : 'profile'}.
            </p>

            <Button variant="primary" className="w-full pt-1" onClick={generate}>
              Generate Letter
            </Button>
          </Card>

          {/* Letter history */}
          {state.letters.length > 0 && (
            <div>
              <div className="font-semibold text-xs mb-2 text-muted">Letter history</div>
              <div className="space-y-1.5">
                {state.letters.slice().reverse().map(l => (
                  <Card key={l.id} className="py-2.5 px-3 flex items-center justify-between gap-2">
                    <div
                      className="flex-1 cursor-pointer min-w-0"
                      onClick={() => {
                        setGenerated(l.body);
                        setEditBody(l.body);
                        setEditing(false);
                        setSaved(true);
                      }}
                    >
                      <div className="text-xs font-semibold text-text truncate">
                        {l.type.toUpperCase()} · {l.mode}
                      </div>
                      <div className="text-xs text-muted truncate">{l.date} · {l.addressedTo || '—'}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger-text hover:text-danger-text !p-1.5"
                      onClick={() => setDeleteConfirmId(l.id)}
                      aria-label="Delete letter"
                    >
                      <Icon name="trash" size={14} />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div className="md:col-span-3">
          {generated ? (
            <Card className="p-5 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2 no-print">
                <div className="font-semibold text-sm text-text flex items-center gap-2">
                  <span>Letter Preview</span>
                  {saved && <Badge tone="success" size="sm">Saved</Badge>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(v => !v)}
                    iconLeft={<Icon name={editing ? 'check' : 'edit'} size={14} />}
                  >
                    {editing ? 'Preview' : 'Edit text'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={save}
                    disabled={saved}
                  >
                    {saved ? 'Saved ✓' : 'Save'}
                  </Button>
                  <Link href={`/print/letter/${latestId || 'new'}`} className="no-print">
                    <Button variant="primary" size="sm" iconLeft={<Icon name="download" size={14} />}>
                      Download PDF
                    </Button>
                  </Link>
                </div>
              </div>

              {editing ? (
                <Textarea
                  className="font-mono text-xs flex-1 !min-h-[360px]"
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                />
              ) : (
                <div
                  className="flex-1 rounded-xl p-6 text-xs whitespace-pre-wrap leading-relaxed border border-border bg-surface text-text font-mono"
                  style={{ minHeight: 360 }}
                >
                  {editing ? editBody : generated}
                </div>
              )}
            </Card>
          ) : (
            <Card className="flex items-center justify-center min-h-[360px] p-8 text-center">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-hover border border-border flex items-center justify-center text-muted mx-auto">
                  <Icon name="file-text" size={24} />
                </div>
                <h4 className="font-semibold text-sm text-text">No letter generated</h4>
                <p className="text-xs text-muted max-w-xs">
                  Fill in the recipient and purpose on the left, then click &ldquo;Generate Letter&rdquo;.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Letter"
          message="Are you sure you want to delete this letter record from your history?"
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => {
            dispatch({ type: 'DELETE_LETTER', id: deleteConfirmId });
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </PageContainer>
  );
}
