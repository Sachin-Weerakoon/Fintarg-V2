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
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { EmptyState } from '@/components/ui/EmptyState';

import { FormalLetterSheet } from '@/components/ui/FormalLetterSheet';

type Template = 'bank' | 'offer' | 'general';

function generateBody(
  template: Template,
  mode: 'personal' | 'business',
  profile: ReturnType<typeof useApp>['state']['profile'],
  company: ReturnType<typeof useApp>['state']['companies'][0] | null,
  addressedTo: string,
  purpose: string,
  accountNumber: string,
  defaultAccount?: ReturnType<typeof useApp>['state']['bankAccounts'][0] | null,
): string {
  const name = mode === 'business' && company ? company.name : profile.name || 'Your Name';
  const address = mode === 'business' && company ? company.address : profile.address || 'Address, City';
  const contact = mode === 'business' && company ? company.contact : profile.mobile || '';
  const date = new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' });
  const accNum = accountNumber || profile.accountNumber || defaultAccount?.accountNumber || '— — — —';
  const bankName = mode === 'personal'
    ? (profile.bankName || defaultAccount?.bankName || 'Bank')
    : 'Bank';

  if (template === 'bank') {
    return `${name}
${address}${contact ? '\n' + contact : ''}

${date}

${addressedTo || 'The Manager'}
${bankName}

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
  const confirm = useConfirm();
  const toast = useToast();
  const { profile } = state;
  const isBusiness = profile.plan === 'business';

  const nonCashAccounts = state.bankAccounts.filter(b => b.accountType !== 'cash');
  const defaultAccount = nonCashAccounts[0] || state.bankAccounts[0] || null;
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccount?.id || '');

  const [mode, setMode] = useState<'personal' | 'business'>('personal');
  const [template, setTemplate] = useState<Template>('bank');
  const [selectedCompanyId, setSelectedCompanyId] = useState(state.companies[0]?.id || '');
  const [form, setForm] = useState({
    addressedTo: defaultAccount ? `The Manager, ${defaultAccount.bankName}` : '',
    accountNumber: defaultAccount?.accountNumber || profile.accountNumber || '',
    purpose: '',
  });
  const [generated, setGenerated] = useState('');
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [saved, setSaved] = useState(false);
  const handleDelete = async (id: string, purpose: string) => {
    const ok = await confirm({
      title: 'Delete Letter',
      message: `Are you sure you want to delete the letter for "${purpose}" from your history?`,
      confirmLabel: 'Yes, Delete',
      cancelLabel: 'No, Keep',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_LETTER', id });
      toast.success('Letter record deleted');
    }
  };

  const selectedCompany = state.companies.find(c => c.id === selectedCompanyId) || null;

  const missingFields: string[] = [];
  if (!profile.name) missingFields.push('name');
  if (!profile.address) missingFields.push('address');
  if (template === 'bank' && !profile.accountNumber && !form.accountNumber && !defaultAccount?.accountNumber) {
    missingFields.push('account number');
  }

  const generate = () => {
    const activeAccount = state.bankAccounts.find(b => b.id === selectedAccountId) || defaultAccount;
    const body = generateBody(template, mode, profile, selectedCompany, form.addressedTo, form.purpose, form.accountNumber, activeAccount);
    setGenerated(body);
    setEditBody(body);
    setEditing(false);
    setSaved(false);
    try {
      sessionStorage.setItem('fintarg_current_letter', JSON.stringify({
        body,
        mode,
        date: new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' }),
        companyId: mode === 'business' ? selectedCompanyId : undefined,
      }));
    } catch {
      // ignore
    }
  };

  const save = () => {
    const finalBody = editing ? editBody : generated;
    if (!finalBody) return;
    const newId = 'lt_' + Date.now();
    dispatch({
      type: 'ADD_LETTER',
      entry: {
        id: newId,
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
    toast.success('Letter saved to history');
    try {
      sessionStorage.setItem('fintarg_current_letter', JSON.stringify({
        body: finalBody,
        mode,
        date: new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' }),
        companyId: mode === 'business' ? selectedCompanyId : undefined,
      }));
    } catch {
      // ignore
    }
  };

  const latestId = state.letters.length > 0 ? state.letters[state.letters.length - 1].id : null;

  return (
    <PageContainer>
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

            {template === 'bank' && nonCashAccounts.length > 0 && (
              <Field id="letter-account-select" label="Select bank account">
                <Select
                  value={selectedAccountId}
                  onChange={e => {
                    const accId = e.target.value;
                    setSelectedAccountId(accId);
                    const acc = state.bankAccounts.find(b => b.id === accId);
                    if (acc) {
                      setForm(f => ({
                        ...f,
                        accountNumber: acc.accountNumber,
                        addressedTo: `The Manager, ${acc.bankName}`,
                      }));
                    }
                  }}
                >
                  {nonCashAccounts.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.bankName} - {b.accountNumber || 'No acc#'})
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {template === 'bank' && (
              <Field id="letter-account" label="Account number">
                <Input
                  value={form.accountNumber}
                  onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                  placeholder={defaultAccount?.accountNumber || profile.accountNumber || '0012 3456 789'}
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
                      onClick={() => handleDelete(l.id, l.purpose || l.type)}
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
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-2xl bg-surface border border-border flex items-center justify-between flex-wrap gap-2 no-print shadow-xs">
                <div className="font-semibold text-xs sm:text-sm text-text flex items-center gap-2 pl-1">
                  <span>Letter Preview</span>
                  {saved && <Badge tone="success" size="sm">Saved</Badge>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(v => !v)}
                    iconLeft={<Icon name={editing ? 'check' : 'edit'} size={14} />}
                  >
                    {editing ? 'View Letterhead' : 'Edit Text'}
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
                <Card className="p-4">
                  <Textarea
                    className="font-mono text-xs flex-1 !min-h-[420px]"
                    value={editBody}
                    onChange={e => {
                      setEditBody(e.target.value);
                      try {
                        sessionStorage.setItem('fintarg_current_letter', JSON.stringify({
                          body: e.target.value,
                          mode,
                          date: new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' }),
                          companyId: mode === 'business' ? selectedCompanyId : undefined,
                        }));
                      } catch {
                        // ignore
                      }
                    }}
                  />
                </Card>
              ) : (
                <FormalLetterSheet
                  body={editing ? editBody : generated}
                  date={new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' })}
                  mode={mode}
                  companyName={selectedCompany?.name}
                  className="shadow-sm"
                />
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Icon name="documents" size={28} />}
              title="No letter generated"
              helper="Fill in the recipient and purpose on the left, then click Generate Letter to preview."
            />
          )}
        </div>
      </div>


    </PageContainer>
  );
}
