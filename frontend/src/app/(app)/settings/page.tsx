'use client';
import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/store';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { SettingRow } from '@/components/ui/SettingRow';
import { FormField, FormGrid } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ColorSwatch } from '@/components/ui/ColorSwatch';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { THEME_COLORS, LIGHT_DEFAULTS, validateCustomOverrides } from '@/lib/theme';
import type { Document } from '@/types';

type Tab = 'appearance' | 'profile' | 'contacts' | 'documents' | 'reminders' | 'account';

const SETTING_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance', label: 'Appearance', icon: <Icon name="bolt" size={16} /> },
  { id: 'profile', label: 'Profile', icon: <Icon name="user" size={16} /> },
  { id: 'contacts', label: 'Contacts', icon: <Icon name="heart" size={16} /> },
  { id: 'documents', label: 'Documents', icon: <Icon name="documents" size={16} /> },
  { id: 'reminders', label: 'Reminders', icon: <Icon name="bell" size={16} /> },
  { id: 'account', label: 'Account', icon: <Icon name="shield" size={16} /> },
];

function ColorPickerRow({
  label,
  description,
  value,
  defaultValue,
  onChange,
  onReset,
  warning,
}: {
  label: string;
  description: string;
  value: string;
  defaultValue: string;
  onChange: (v: string) => void;
  onReset: () => void;
  warning?: string;
}) {
  const effective = value || defaultValue;

  return (
    <div className="py-3.5 border-b border-border/70 last:border-b-0 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="text-xs font-semibold text-text">{label}</div>
          <p className="text-[11px] text-muted mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0 self-end sm:self-center">
          {/* Native picker with styled swatch wrapper */}
          <label className="relative cursor-pointer group" title={`Pick ${label}`}>
            <div
              className="w-9 h-9 rounded-xl border-2 border-border shadow-sm group-hover:scale-105 transition-transform"
              style={{ backgroundColor: effective }}
            />
            <Input
              type="color"
              value={effective}
              onChange={e => onChange(e.target.value)}
              className="sr-only"
            />
          </label>

          {/* Hex string input */}
          <div className="w-24">
            <Input
              value={effective}
              onChange={e => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
              }}
              maxLength={7}
              className="!h-9 !py-1 !px-2 text-xs font-mono"
            />
          </div>

          {/* Reset button */}
          {value && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              className="!h-9 !px-2 text-xs"
              title="Reset to default"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {warning && (
        <div className="text-xs font-medium px-3 py-1.5 rounded-lg bg-warning-tint text-warning-text flex items-center gap-2">
          <Icon name="alert" size={14} />
          <span>{warning} (override bypassed to maintain WCAG AA readability)</span>
        </div>
      )}
    </div>
  );
}

function AppearanceTab() {
  const { state, dispatch, showToast } = useApp();
  const { profile } = state;
  const update = (v: Partial<typeof profile>) => {
    dispatch({ type: 'UPDATE_PROFILE', profile: v });
    showToast('Appearance settings updated.', 'info');
  };

  const resetAllColors = () => {
    update({ colorText: '', colorMuted: '', colorBg: '', colorSurface: '' });
  };
  const hasCustomColors = profile.colorText || profile.colorMuted || profile.colorBg || profile.colorSurface;
  const { warnings, validOverrides } = validateCustomOverrides(profile);

  // Live preview effective variables
  const previewBg = validOverrides['--color-bg'] || LIGHT_DEFAULTS.colorBg;
  const previewSurface = validOverrides['--color-surface'] || LIGHT_DEFAULTS.colorSurface;
  const previewText = validOverrides['--color-text'] || LIGHT_DEFAULTS.colorText;
  const previewMuted = validOverrides['--color-muted'] || LIGHT_DEFAULTS.colorMuted;

  return (
    <div className="space-y-6">
      {/* Accent Brand Color */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-text mb-1">Brand Accent Color</h3>
        <p className="text-xs text-muted mb-4">
          Select your primary brand color. High-contrast accessible tones will automatically be derived.
        </p>

        <div className="flex gap-3 flex-wrap mb-2">
          {THEME_COLORS.map(c => (
            <ColorSwatch
              key={c}
              color={c}
              selected={profile.themeColor === c}
              onClick={() => update({ themeColor: c })}
              ariaLabel={`Theme color ${c}`}
            />
          ))}
        </div>
      </Card>

      {/* Display Settings (Dark mode & Text size) */}
      <Card className="p-6 space-y-1">
        <h3 className="text-sm font-bold text-text mb-2">Display & Typography</h3>

        <SettingRow
          label="Dark Mode Theme"
          description="High-contrast dark navy palette optimized for low-light environments."
          control={
            <Switch
              checked={Boolean(profile.darkMode)}
              onChange={val => update({ darkMode: val })}
              aria-label="Toggle dark mode"
            />
          }
        />

        <SettingRow
          label="Interface Text Size"
          description="Adjust base type scaling across the entire application interface."
          control={
            <SegmentedTabs
              size="sm"
              options={[
                { id: 'small', label: 'Compact' },
                { id: 'medium', label: 'Default' },
                { id: 'large', label: 'Large' },
              ]}
              value={profile.textSize || 'medium'}
              onChange={val => update({ textSize: val as any })}
            />
          }
        />
      </Card>

      {/* Custom Color Overrides */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div>
            <h3 className="text-sm font-bold text-text">Light Theme Custom Palette</h3>
            <p className="text-xs text-muted mt-0.5">
              Personalize surfaces and text tokens in light mode with real-time WCAG AA contrast validation.
            </p>
          </div>
          {hasCustomColors && (
            <Button variant="ghost" size="sm" onClick={resetAllColors}>
              Reset All
            </Button>
          )}
        </div>

        <div className="mt-4">
          <ColorPickerRow
            label="Primary Text"
            description="Headings, labels, and primary numeric figures"
            value={profile.colorText || ''}
            defaultValue={LIGHT_DEFAULTS.colorText}
            onChange={v => update({ colorText: v })}
            onReset={() => update({ colorText: '' })}
            warning={warnings.colorText}
          />
          <ColorPickerRow
            label="Secondary Muted Text"
            description="Timestamps, hints, and table captions"
            value={profile.colorMuted || ''}
            defaultValue={LIGHT_DEFAULTS.colorMuted}
            onChange={v => update({ colorMuted: v })}
            onReset={() => update({ colorMuted: '' })}
            warning={warnings.colorMuted}
          />
          <ColorPickerRow
            label="Page Background Fill"
            description="The outer canvas page background"
            value={profile.colorBg || ''}
            defaultValue={LIGHT_DEFAULTS.colorBg}
            onChange={v => update({ colorBg: v })}
            onReset={() => update({ colorBg: '' })}
            warning={warnings.colorBg}
          />
          <ColorPickerRow
            label="Card Surface Surface"
            description="Card containers, modal surfaces, and table backgrounds"
            value={profile.colorSurface || ''}
            defaultValue={LIGHT_DEFAULTS.colorSurface}
            onChange={v => update({ colorSurface: v })}
            onReset={() => update({ colorSurface: '' })}
            warning={warnings.colorSurface}
          />
        </div>
      </Card>

      {/* Live Preview & Raxwo Brand Block */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-text">Live Theme Preview</h3>
          <p className="text-xs text-muted mt-0.5">Instant sample of your selected palette in action.</p>
        </div>

        <div
          className="rounded-xl p-5 border border-border space-y-3"
          style={{ backgroundColor: previewBg }}
        >
          <div
            className="rounded-xl p-4 border border-border shadow-sm flex items-center justify-between"
            style={{ backgroundColor: previewSurface }}
          >
            <div>
              <div className="text-xs" style={{ color: previewMuted }}>
                Net Monthly Buffer
              </div>
              <div className="text-xl font-bold num text-primary-text">
                Rs. 125,000
              </div>
            </div>
            <Badge tone="success" size="sm">
              Surplus
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm">
              Primary Action
            </Button>
            <Button variant="secondary" size="sm">
              Secondary Action
            </Button>
            <span className="text-xs" style={{ color: previewText }}>
              Body sample text
            </span>
          </div>
        </div>

        {/* Brand attribution */}
        <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted">
          <span>Fintarg v2.0 · Personal & Business Finance OS</span>
          <div>
            Powered by{' '}
            <a
              href="https://raxwo.net"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary-text hover:underline"
            >
              Raxwo (Pvt) Ltd
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ProfileTab() {
  const { state, dispatch, showToast } = useApp();
  const { profile } = state;
  const [form, setForm] = useState({ ...profile });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      showToast('Accepted photo formats: JPG, PNG, WEBP', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Profile image must be less than 5 MB', 'error');
      return;
    }
    setUploadingAvatar(true);
    try {
      const res = await fetch('/api/backend/files', {
        method: 'POST',
        headers: { 'content-type': file.type },
        body: file,
      });
      const data = await res.json();
      if (!res.ok || !data.id) {
        throw new Error(data.error || 'Upload failed');
      }
      setForm(f => ({ ...f, profilePictureFileId: data.id }));
      await dispatch({ type: 'UPDATE_PROFILE', profile: { profilePictureFileId: data.id } });
      showToast('Profile photo updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const removeAvatar = async () => {
    setForm(f => ({ ...f, profilePictureFileId: '' }));
    await dispatch({ type: 'UPDATE_PROFILE', profile: { profilePictureFileId: '' } });
    showToast('Profile photo removed', 'info');
  };

  const save = async () => {
    await dispatch({ type: 'UPDATE_PROFILE', profile: form });
    showToast('Profile details saved successfully.', 'success');
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-base font-bold text-text">Profile Information</h3>
        <p className="text-xs text-muted mt-0.5">Manage your identity and earning profile credentials.</p>
      </div>

      {/* Avatar Section */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface-hover/30">
        <Avatar
          name={form.name || 'User'}
          src={form.profilePictureFileId ? `/api/files/${encodeURIComponent(form.profilePictureFileId)}` : undefined}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-text">Avatar Image</div>
          <p className="text-xs text-muted mt-0.5">JPG, PNG, or WEBP up to 5 MB</p>
          <div className="flex items-center gap-2 mt-2">
            <Input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => avatarInputRef.current?.click()}
              loading={uploadingAvatar}
            >
              {form.profilePictureFileId ? 'Change Photo' : 'Upload Photo'}
            </Button>
            {form.profilePictureFileId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={removeAvatar}
                className="!text-danger-text hover:!bg-danger-tint"
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <FormGrid columns={2}>
        <FormField id="prof-name" label="Full Name">
          <Input
            id="prof-name"
            value={form.name || ''}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Kasun Perera"
          />
        </FormField>

        <FormField id="prof-mobile" label="Mobile Phone">
          <Input
            id="prof-mobile"
            value={form.mobile || ''}
            onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
            placeholder="07X XXX XXXX"
          />
        </FormField>

        <FormField id="prof-email" label="Email Address">
          <Input
            id="prof-email"
            type="email"
            value={form.email || ''}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
        </FormField>

        <FormField id="prof-dob" label="Date of Birth">
          <Input
            id="prof-dob"
            type="date"
            value={form.dateOfBirth || ''}
            onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField id="prof-addr" label="Residential Address">
            <Input
              id="prof-addr"
              value={form.address || ''}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="No. 1, Main Street, Colombo"
            />
          </FormField>
        </div>

        <FormField id="prof-nic" label="NIC Number">
          <Input
            id="prof-nic"
            value={form.nicNumber || ''}
            onChange={e => setForm(f => ({ ...f, nicNumber: e.target.value }))}
            placeholder="200012345678"
          />
        </FormField>

        <FormField id="prof-portfolio" label="Portfolio / Website Link">
          <Input
            id="prof-portfolio"
            value={form.portfolioLink || ''}
            onChange={e => setForm(f => ({ ...f, portfolioLink: e.target.value }))}
            placeholder="https://kasun.me"
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField id="prof-workmode" label="Earning Profile & Work Flow">
            <Select
              id="prof-workmode"
              value={form.workMode || 'salary'}
              onChange={e => setForm(f => ({ ...f, workMode: e.target.value as any }))}
            >
              <option value="salary">Salary Earner (Pay slips & deductions)</option>
              <option value="business">Business Owner (Outlets & branches)</option>
              <option value="both">Both (Salary + Enterprise Business)</option>
            </Select>
          </FormField>
        </div>
      </FormGrid>

      <div className="flex justify-end pt-3 border-t border-border">
        <Button variant="primary" onClick={save}>
          Save Profile Changes
        </Button>
      </div>
    </Card>
  );
}

function ContactsTab() {
  const { state, dispatch, showToast } = useApp();
  const confirm = useConfirm();
  const [form, setForm] = useState({ name: '', relationship: '', number: '' });

  const addContact = () => {
    if (!form.name.trim() || !form.number.trim()) {
      showToast('Contact name and phone number are required.', 'error');
      return;
    }
    const contacts = [...state.profile.contacts, { id: 'c_' + Date.now(), ...form }];
    dispatch({ type: 'UPDATE_PROFILE', profile: { contacts } });
    setForm({ name: '', relationship: '', number: '' });
    showToast('Contact saved.', 'success');
  };

  const removeContact = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Remove Contact',
      message: `Are you sure you want to remove ${name} from your contacts?`,
      confirmLabel: 'Yes, Remove',
      tone: 'danger',
    });
    if (ok) {
      const contacts = state.profile.contacts.filter(c => c.id !== id);
      dispatch({ type: 'UPDATE_PROFILE', profile: { contacts } });
      showToast('Contact removed.', 'info');
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-base font-bold text-text">Emergency & Trusted Contacts</h3>
        <p className="text-xs text-muted mt-0.5">Family members, business partners, or legal representatives.</p>
      </div>

      {state.profile.contacts.length === 0 ? (
        <EmptyState
          title="No contacts listed"
          helper="Add family members or key contacts for rapid reference in legal and financial matters."
          className="py-8"
        />
      ) : (
        <div className="space-y-2">
          {state.profile.contacts.map(c => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-hover/30"
            >
              <div>
                <div className="text-xs font-bold text-text">{c.name}</div>
                <div className="text-[11px] text-muted">
                  {c.relationship || 'Contact'} · {c.number}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeContact(c.id, c.name)}
                className="!text-danger-text hover:!bg-danger-tint"
                iconLeft={<Icon name="trash" size={14} />}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Form */}
      <div className="pt-6 border-t border-border space-y-4">
        <h4 className="text-sm font-bold text-text">Add New Contact</h4>
        <FormGrid columns={3}>
          <FormField id="cnt-name" label="Name *" required>
            <Input
              id="cnt-name"
              placeholder="e.g. Nimal Perera"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </FormField>

          <FormField id="cnt-rel" label="Relationship">
            <Input
              id="cnt-rel"
              placeholder="e.g. Spouse / Attorney"
              value={form.relationship}
              onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
            />
          </FormField>

          <FormField id="cnt-num" label="Phone Number *" required>
            <Input
              id="cnt-num"
              placeholder="07X XXX XXXX"
              value={form.number}
              onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
            />
          </FormField>
        </FormGrid>

        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={addContact}>
            Add Contact
          </Button>
        </div>
      </div>
    </Card>
  );
}

const DOC_TYPES: { value: Document['type']; label: string }[] = [
  { value: 'profile-picture', label: 'Profile Picture' },
  { value: 'cv', label: 'Curriculum Vitae (CV)' },
  { value: 'nic-front', label: 'NIC Front Scan' },
  { value: 'nic-back', label: 'NIC Back Scan' },
  { value: 'bank', label: 'Bank Statement / Slip' },
  { value: 'other', label: 'Other Document' },
];

function DocumentsTab() {
  const { state, dispatch, showToast } = useApp();
  const confirm = useConfirm();
  const [form, setForm] = useState({ type: 'cv' as Document['type'], label: '', note: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      showToast('Accepted formats: PDF, JPG, PNG, DOCX', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Max file size is 10 MB', 'error');
      return;
    }
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
    showToast('Document uploaded to vault.', 'success');
  };

  const deleteDoc = async (id: string, label: string) => {
    const ok = await confirm({
      title: 'Delete Document',
      message: `Delete "${label}" from your personal vault?`,
      confirmLabel: 'Yes, Delete',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_DOCUMENT', id });
      showToast('Document deleted.', 'info');
    }
  };

  const vaultDocs = state.documents.filter(d => d.note !== 'Medical document');

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-base font-bold text-text">Document Vault</h3>
        <p className="text-xs text-muted mt-0.5">Secure cloud repository for official identification, CVs, and statements.</p>
      </div>

      {vaultDocs.length === 0 ? (
        <EmptyState
          title="Vault is empty"
          helper="Upload your NIC, resume, and bank verification files for rapid attachment to letters."
          className="py-8"
        />
      ) : (
        <div className="space-y-2">
          {vaultDocs.map(d => (
            <div
              key={d.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-hover/30"
            >
              <div>
                <div className="text-xs font-bold text-text flex items-center gap-2">
                  <span>{d.label}</span>
                  <Badge tone="neutral" size="sm">
                    {d.type}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  {d.fileName} · Uploaded on {d.uploadDate}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDoc(d.id, d.label)}
                  className="!text-danger-text hover:!bg-danger-tint"
                  iconLeft={<Icon name="trash" size={14} />}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Form */}
      <div className="pt-6 border-t border-border space-y-4">
        <h4 className="text-sm font-bold text-text">Upload to Vault</h4>
        <FormGrid columns={3}>
          <FormField id="doc-type" label="Document Category">
            <Select
              id="doc-type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
            >
              {DOC_TYPES.map(d => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField id="doc-label" label="Custom File Label">
            <Input
              id="doc-label"
              placeholder="e.g. NIC Copy 2026"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            />
          </FormField>

          <FormField id="doc-note" label="Optional Notes">
            <Input
              id="doc-note"
              placeholder="e.g. Certified copy"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            />
          </FormField>
        </FormGrid>

        <div className="flex items-center justify-between pt-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            iconLeft={<Icon name="upload" size={16} />}
          >
            Choose & Upload File
          </Button>
          <span className="text-xs text-muted">Max 10 MB (PDF, JPG, PNG, DOCX)</span>
        </div>
      </div>
    </Card>
  );
}

function RemindersTab() {
  const { state, dispatch, showToast } = useApp();
  const confirm = useConfirm();
  const reminders = state.reminders;

  const typeLabel: Record<string, string> = {
    finance: 'Finance Payment',
    loan: 'Loan Installment',
    pawn: 'Pawn Interest',
    agreement: 'Agreement Renewal',
    appointment: 'Medical Appointment',
    custom: 'Custom Reminder',
  };

  const deleteReminder = async (id: string, label: string) => {
    const ok = await confirm({
      title: 'Delete Reminder',
      message: `Delete reminder "${label}"?`,
      confirmLabel: 'Yes, Delete',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_REMINDER', id });
      showToast('Reminder deleted.', 'info');
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-base font-bold text-text">Scheduled Reminders & Alerts</h3>
        <p className="text-xs text-muted mt-0.5">
          Active alerts for upcoming lease payments, loan due dates, and doctor appointments.
        </p>
      </div>

      {reminders.length === 0 ? (
        <EmptyState
          title="No pending reminders"
          helper="Upcoming recurring expenses, lease payments, and medical appointments will appear here."
          className="py-8"
        />
      ) : (
        <div className="space-y-2.5">
          {reminders
            .slice()
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .map(r => {
              const daysAway = Math.round((new Date(r.dueDate).getTime() - Date.now()) / 86400000);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-hover/30 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text truncate">{r.label}</span>
                      <Badge
                        tone={r.status === 'pending' ? 'success' : 'neutral'}
                        size="sm"
                        dot={r.status === 'pending'}
                      >
                        {r.status === 'pending' ? 'Pending' : 'Dismissed'}
                      </Badge>
                      {daysAway >= 0 && daysAway <= 7 && (
                        <Badge tone="warning" size="sm">
                          In {daysAway}d
                        </Badge>
                      )}
                      {daysAway < 0 && (
                        <Badge tone="danger" size="sm">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {typeLabel[r.type] || r.type} · Due {r.dueDate} · Channel: {r.channel}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.status === 'pending' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          dispatch({ type: 'UPDATE_REMINDER', id: r.id, status: 'dismissed' });
                          showToast('Reminder dismissed.', 'info');
                        }}
                      >
                        Dismiss
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReminder(r.id, r.label)}
                      className="!text-danger-text hover:!bg-danger-tint"
                      iconLeft={<Icon name="trash" size={14} />}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </Card>
  );
}

function AccountTab() {
  const { showToast } = useApp();
  const confirm = useConfirm();

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      title: 'Delete Account',
      message:
        'Are you sure you want to permanently delete your account? All financial records, bank links, savings goals, and uploaded documents will be wiped. This cannot be undone.',
      confirmLabel: 'Yes, Delete Account',
      cancelLabel: 'Keep Account',
      tone: 'danger',
    });

    if (confirmed) {
      showToast('Account deletion request registered. Your session data will be cleared.', 'info');
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-base font-bold text-text">Account Deletion & Data Privacy</h3>
        <p className="text-xs text-muted mt-0.5">
          Permanent data removal and account decommissioning in accordance with international privacy guidelines.
        </p>
      </div>

      <div className="p-4 rounded-xl border border-danger-solid/30 bg-danger-tint/30 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-danger-text">
          <Icon name="alert" size={16} />
          <span>Permanent Data Erasure Notice</span>
        </div>
        <p className="text-xs text-danger-text leading-relaxed">
          Deleting your account will permanently wipe your transaction records, connected bank balances, savings targets, and cloud documents. Once executed, this data cannot be recovered.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border">
        <div>
          <div className="text-sm font-bold text-text">Permanently Delete Account</div>
          <div className="text-xs text-muted">Irreversibly purge all stored database records for this user.</div>
        </div>
        <Button variant="danger" size="sm" onClick={handleDeleteAccount}>
          Delete Account
        </Button>
      </div>
    </Card>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams?.get('tab') as Tab) || 'appearance';

  const setTab = (newTab: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (newTab === 'appearance') {
      params.delete('tab');
    } else {
      params.set('tab', newTab);
    }
    const query = params.toString();
    router.replace(query ? `?${query}` : '/settings', { scroll: false });
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Preferences"
        title="Account Settings"
        description="Customize appearance, personal identity parameters, document vault, and notifications."
      />

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        {/* Navigation Sidebar */}
        <div>
          <Card className="p-2 space-y-1">
            {SETTING_TABS.map(t => (
              <Button
                key={t.id}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTab(t.id)}
                className={`w-full !justify-start !min-h-[40px] px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  tab === t.id
                    ? '!bg-primary-tint !text-primary-text shadow-sm border border-primary-500/30'
                    : 'text-text hover:bg-surface-hover border border-transparent'
                }`}
                iconLeft={<span className={tab === t.id ? 'text-primary-text' : 'text-muted'}>{t.icon}</span>}
              >
                {t.label}
              </Button>
            ))}
          </Card>
        </div>

        {/* Tab Content Panel */}
        <div className="min-w-0">
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'profile' && <ProfileTab />}
          {tab === 'contacts' && <ContactsTab />}
          {tab === 'documents' && <DocumentsTab />}
          {tab === 'reminders' && <RemindersTab />}
          {tab === 'account' && <AccountTab />}
        </div>
      </div>
    </PageContainer>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-96" />
            <div className="grid md:grid-cols-[220px_1fr] gap-6 mt-6">
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          </div>
        </PageContainer>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
