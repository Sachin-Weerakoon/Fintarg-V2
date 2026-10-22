'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { getLocalDate } from '@/utils/date';

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
  const companyRegLine = company?.brNumber ? `\nBusiness Registration No: ${company.brNumber}` : '';
  const companyTinLine = company?.tinNumber ? `\nTax Identification No (TIN): ${company.tinNumber}` : '';
  const fullHeader = mode === 'business' && company
    ? `${company.name}${companyRegLine}${companyTinLine}\n${company.address || ''}${company.contact ? '\nTel: ' + company.contact : ''}${company.email ? '\nEmail: ' + company.email : ''}`.trim()
    : `${profile.name || 'Your Name'}\n${profile.address || 'Address, City'}${profile.mobile ? '\nTel: ' + profile.mobile : ''}`.trim();

  const signoffBlock = mode === 'business' && company
    ? `${profile.name || 'Authorized Signatory'}\nAuthorized Signatory\n${company.name}`
    : `${profile.name || 'Your Name'}`;

  const date = new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' });
  const accNum = accountNumber || profile.accountNumber || defaultAccount?.accountNumber || '— — — —';
  const bankName = mode === 'personal'
    ? (profile.bankName || defaultAccount?.bankName || 'Bank')
    : 'Bank';

  if (template === 'bank') {
    return `${fullHeader}

${date}

${addressedTo || 'The Manager'}
${bankName}

Dear Sir/Madam,

RE: ${purpose || 'Account Enquiry'}

I${mode === 'business' && company ? ', on behalf of ' + company.name + ',' : ''} am writing regarding account number ${accNum}. I kindly request your assistance with the above matter.

Please process this at your earliest convenience and do not hesitate to contact us should you require further information.

Yours faithfully,

${signoffBlock}`;
  }

  if (template === 'offer') {
    return `${fullHeader}

${date}

${addressedTo || 'Sir/Madam'}

Dear Sir/Madam,

RE: ${purpose || 'Commercial Proposal / Offer'}

We${mode === 'business' && company ? ' at ' + company.name : ''} are pleased to submit this proposal for your consideration. We believe this arrangement will be mutually beneficial and look forward to a positive response.

Please review the enclosed terms and revert at your earliest convenience.

Yours sincerely,

${signoffBlock}`;
  }

  return `${fullHeader}

${date}

${addressedTo || 'Sir/Madam'}

Dear Sir/Madam,

RE: ${purpose || 'Formal Correspondence'}

${purpose ? purpose + '.\n\n' : ''}We trust this communication meets with your satisfaction. Please do not hesitate to contact us should you require any additional information or verification.

Yours faithfully,

${signoffBlock}`;
}

function LettersClient() {
  const { state, dispatch } = useApp();
  const confirm = useConfirm();
  const toast = useToast();
  const searchParams = useSearchParams();
  const { profile } = state;

  const hasBusiness = profile.plan === 'business' || profile.workMode === 'business' || profile.workMode === 'both' || (state.companies && state.companies.length > 0);

  const nonCashAccounts = state.bankAccounts.filter(b => b.accountType !== 'cash');
  const defaultAccount = nonCashAccounts[0] || state.bankAccounts[0] || null;
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccount?.id || '');

  const urlCompanyId = searchParams.get('companyId');
  const initialCompany = state.companies.find(c => c.id === urlCompanyId) || state.companies[0];

  const [mode, setMode] = useState<'personal' | 'business'>(urlCompanyId ? 'business' : 'personal');
  const [template, setTemplate] = useState<Template>('bank');
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompany?.id || '');
  const [form, setForm] = useState({
    addressedTo: defaultAccount ? `The Manager, ${defaultAccount.bankName}` : '',
    accountNumber: defaultAccount?.accountNumber || profile.accountNumber || '',
    purpose: '',
  });
  const [generated, setGenerated] = useState('');
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (urlCompanyId && state.companies.some(c => c.id === urlCompanyId)) {
      setSelectedCompanyId(urlCompanyId);
      setMode('business');
    }
  }, [urlCompanyId, state.companies]);

  const selectedCompany = state.companies.find(c => c.id === selectedCompanyId) || state.companies[0] || null;

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

  const missingFields: string[] = [];
  if (mode === 'personal') {
    if (!profile.name) missingFields.push('name');
    if (!profile.address) missingFields.push('address');
  } else if (selectedCompany) {
    if (!selectedCompany.name) missingFields.push('company name');
    if (!selectedCompany.address) missingFields.push('registered office address');
  }

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
        companyId: mode === 'business' ? selectedCompany?.id : undefined,
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
        date: getLocalDate(),
        addressedTo: form.addressedTo,
        purpose: form.purpose,
        body: finalBody,
        companyId: mode === 'business' ? selectedCompany?.id : undefined,
      },
    });
    setSaved(true);
    toast.success('Letter saved to history');
    try {
      sessionStorage.setItem('fintarg_current_letter', JSON.stringify({
        body: finalBody,
        mode,
        date: new Date().toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' }),
        companyId: mode === 'business' ? selectedCompany?.id : undefined,
      }));
    } catch {
      // ignore
    }
  };

  const latestId = state.letters.length > 0 ? state.letters[state.letters.length - 1].id : null;

  return (
    <PageContainer>
      <PageHeader
        title="Formal Letters"
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
          {/* Issuing Entity Toggle */}
          {hasBusiness && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text uppercase tracking-wide">Issuing Entity / Letterhead</label>
              <SegmentedTabs
                options={[
                  { id: 'personal', label: 'Personal Individual' },
                  { id: 'business', label: 'Registered Enterprise' },
                ]}
                value={mode}
                onChange={v => setMode(v as any)}
              />
            </div>
          )}

          {/* Company Selection Card for Business Letters */}
          {mode === 'business' && (
            <Card className="p-4 space-y-3 bg-primary-tint/20 border-primary/25">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary-text flex items-center gap-1.5">
                  <Icon name="bank" size={14} />
                  Selected Business Entity
                </span>
                <Link href="/advanced?tab=businesses" className="text-[11px] font-semibold text-primary-text hover:underline">
                  Manage Businesses →
                </Link>
              </div>

              {state.companies.length === 0 ? (
                <div className="p-3 bg-surface rounded-xl border border-border text-xs text-muted">
                  No registered companies found. Please register an enterprise company to generate corporate letterheads.
                </div>
              ) : (
                <Field id="letter-company" label="Choose Specific Business">
                  <Select
                    value={selectedCompanyId}
                    onChange={e => setSelectedCompanyId(e.target.value)}
                  >
                    {state.companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.brNumber ? `(BR: ${c.brNumber})` : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {selectedCompany && (
                <div className="text-[11px] text-muted space-y-1 pt-1 border-t border-border/50">
                  <div className="font-semibold text-text">{selectedCompany.name}</div>
                  {selectedCompany.brNumber && <div>Registration: {selectedCompany.brNumber}</div>}
                  {selectedCompany.tinNumber && <div>TIN: {selectedCompany.tinNumber}</div>}
                  {selectedCompany.address && <div>Registered Office: {selectedCompany.address}</div>}
                </div>
              )}
            </Card>
          )}

          {missingFields.length > 0 && (
            <div className="p-3.5 rounded-xl border border-warning-solid/30 bg-warning-tint/30 text-warning-text text-xs">
              <span className="font-semibold">Notice:</span> Missing {missingFields.join(', ')} in {mode === 'personal' ? 'your profile' : 'selected company profile'}.{' '}
              <Link href={mode === 'personal' ? '/settings' : '/advanced?tab=businesses'} className="font-semibold underline text-primary-text">
                Update Profile →
              </Link>
            </div>
          )}

          <Card className="p-5 space-y-3.5">
            <Field id="letter-template" label="Template">
              <Select value={template} onChange={e => setTemplate(e.target.value as Template)}>
                <option value="bank">Bank Letter</option>
                <option value="offer">Commercial Proposal</option>
                <option value="general">Formal General Correspondence</option>
              </Select>
            </Field>

            <Field id="letter-addressee" label="Addressed to">
              <Input
                value={form.addressedTo}
                onChange={e => setForm(f => ({ ...f, addressedTo: e.target.value }))}
                placeholder="The Manager, Bank / Recipient"
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
              <Field id="letter-account-number" label="Account number">
                <Input
                  value={form.accountNumber}
                  onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="e.g. 0011223344"
                />
              </Field>
            )}

            <Field id="letter-purpose" label="Purpose">
              <Input
                value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder={
                  template === 'bank'
                    ? 'Statement request, Loan NOC, Account confirmation'
                    : template === 'offer'
                    ? 'IT Consultancy Services, Partnership Proposal'
                    : 'Formal Inquiry / Notice'
                }
              />
            </Field>

            <Button variant="primary" className="w-full" onClick={generate}>
              Generate Letterhead Preview
            </Button>
          </Card>

          {/* Letter History */}
          {state.letters.length > 0 && (
            <Card className="p-4 space-y-2">
              <div className="text-xs font-semibold text-text uppercase tracking-wide">Recent Letters</div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {state.letters.slice().reverse().map(l => {
                  const company = state.companies.find(c => c.id === l.companyId);
                  return (
                    <div
                      key={l.id}
                      className="p-2.5 rounded-lg border border-border hover:bg-surface-hover/50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="font-semibold text-text truncate">
                          {l.purpose || 'Formal Letter'}
                        </div>
                        <div className="text-[11px] text-muted flex items-center gap-1.5">
                          <span>{l.date}</span>
                          <span>·</span>
                          <span className="capitalize">{l.mode}</span>
                          {company && (
                            <>
                              <span>·</span>
                              <span className="text-primary-text font-medium truncate">{company.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/print/letter/${l.id}`}>
                          <Button variant="ghost" size="sm" className="!p-1 text-muted hover:text-text" aria-label="Print letter">
                            <Icon name="download" size={13} />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!p-1 text-danger-text hover:bg-danger-tint"
                          onClick={() => handleDelete(l.id, l.purpose)}
                          aria-label="Delete letter"
                        >
                          <Icon name="trash" size={13} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Preview panel */}
        <div className="md:col-span-3">
          {generated || editing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone={mode === 'business' ? 'primary' : 'neutral'}>
                    {mode === 'business' ? (selectedCompany?.name || 'Business') : 'Personal'}
                  </Badge>
                  <span className="text-xs text-muted">Preview ready for export</span>
                </div>
                <div className="flex items-center gap-2">
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
                          companyId: mode === 'business' ? selectedCompany?.id : undefined,
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
                  companyBr={selectedCompany?.brNumber}
                  companyTin={selectedCompany?.tinNumber}
                  companyAddress={selectedCompany?.address}
                  companyContact={selectedCompany?.contact}
                  className="shadow-sm"
                />
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Icon name="documents" size={28} />}
              title="No letter generated"
              helper="Fill in the issuing entity, recipient, and purpose on the left, then click Generate Letter to preview."
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}

export default function LettersPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <PageHeader title="Formal Letters" />
      </PageContainer>
    }>
      <LettersClient />
    </Suspense>
  );
}
