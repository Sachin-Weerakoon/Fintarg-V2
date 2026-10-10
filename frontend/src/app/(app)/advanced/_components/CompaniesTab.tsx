'use client';
import React, { useState } from 'react';
import { useApp } from '@/store';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FormField, FormGrid } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';

export function CompaniesTab() {
  const { state, dispatch, showToast } = useApp();
  const confirm = useConfirm();
  const [form, setForm] = useState({
    name: '',
    brNumber: '',
    tinNumber: '',
    entityType: 'pvt_ltd',
    sector: 'Technology & IT',
    address: '',
    contact: '',
    email: '',
    logo: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    brNumber: '',
    tinNumber: '',
    address: '',
    contact: '',
  });

  const submit = () => {
    if (!form.name.trim()) {
      showToast('Company legal name is required.', 'error');
      return;
    }
    dispatch({ type: 'ADD_COMPANY', entry: { id: 'co_' + Date.now(), ...form } });
    setForm({
      name: '',
      brNumber: '',
      tinNumber: '',
      entityType: 'pvt_ltd',
      sector: 'Technology & IT',
      address: '',
      contact: '',
      email: '',
      logo: '',
    });
    showToast('Company profile added successfully.', 'success');
  };

  const deleteCompany = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Delete Company',
      message: `Are you sure you want to delete "${name}"? This will affect linked letters and contracts.`,
      confirmLabel: 'Yes, Delete',
      tone: 'danger',
    });
    if (ok) {
      dispatch({ type: 'DELETE_COMPANY', id });
      showToast('Company profile deleted.', 'info');
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Companies List */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-text">Registered Companies</h3>
          <p className="text-xs text-muted mt-0.5">Commercial legal entities and enterprise branches</p>
        </div>

        {state.companies.length === 0 ? (
          <EmptyState
            title="No companies registered"
            helper="Add your first business entity to enable business letters, invoicing, and branch workspaces."
            className="py-10"
          />
        ) : (
          <div className="space-y-3">
            {state.companies.map(c => (
              <Card key={c.id} className="p-5">
                {editingId === c.id ? (
                  <div className="space-y-3">
                    <FormField id="edit-co-name" label="Company Name *" required>
                      <Input
                        id="edit-co-name"
                        value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </FormField>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField id="edit-co-br" label="BR Number">
                        <Input
                          id="edit-co-br"
                          value={editForm.brNumber}
                          onChange={e => setEditForm(f => ({ ...f, brNumber: e.target.value }))}
                        />
                      </FormField>
                      <FormField id="edit-co-tin" label="TIN Number">
                        <Input
                          id="edit-co-tin"
                          value={editForm.tinNumber}
                          onChange={e => setEditForm(f => ({ ...f, tinNumber: e.target.value }))}
                        />
                      </FormField>
                    </div>

                    <FormField id="edit-co-addr" label="Address">
                      <Input
                        id="edit-co-addr"
                        value={editForm.address}
                        onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                      />
                    </FormField>

                    <FormField id="edit-co-contact" label="Contact">
                      <Input
                        id="edit-co-contact"
                        value={editForm.contact}
                        onChange={e => setEditForm(f => ({ ...f, contact: e.target.value }))}
                      />
                    </FormField>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          dispatch({ type: 'UPDATE_COMPANY', entry: { ...c, ...editForm } });
                          setEditingId(null);
                          showToast('Company details updated.', 'success');
                        }}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-text">{c.name}</span>
                        {c.brNumber && (
                          <Badge tone="neutral" size="sm">
                            BR: {c.brNumber}
                          </Badge>
                        )}
                        {c.tinNumber && (
                          <Badge tone="neutral" size="sm">
                            TIN: {c.tinNumber}
                          </Badge>
                        )}
                      </div>
                      {c.address && <div className="text-xs text-muted">{c.address}</div>}
                      {c.contact && <div className="text-xs text-muted">{c.contact}</div>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditForm({
                            name: c.name,
                            brNumber: c.brNumber || '',
                            tinNumber: c.tinNumber || '',
                            address: c.address,
                            contact: c.contact,
                          });
                        }}
                        iconLeft={<Icon name="edit" size={14} />}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCompany(c.id, c.name)}
                        className="!text-danger-text hover:!bg-danger-tint"
                        iconLeft={<Icon name="trash" size={14} />}
                      />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Company Form */}
      <div>
        <Card className="p-6">
          <h4 className="text-base font-bold text-text mb-4">Register New Enterprise</h4>
          <div className="space-y-4">
            <FormField id="add-co-name" label="Company Legal Name *" required>
              <Input
                id="add-co-name"
                placeholder="e.g. Apex Lanka Solutions (Pvt) Ltd"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </FormField>

            <FormGrid columns={2}>
              <FormField id="add-co-br" label="BR Number">
                <Input
                  id="add-co-br"
                  placeholder="PV 00234190"
                  value={form.brNumber}
                  onChange={e => setForm(f => ({ ...f, brNumber: e.target.value }))}
                />
              </FormField>
              <FormField id="add-co-tin" label="TIN Number">
                <Input
                  id="add-co-tin"
                  placeholder="109876543"
                  value={form.tinNumber}
                  onChange={e => setForm(f => ({ ...f, tinNumber: e.target.value }))}
                />
              </FormField>
            </FormGrid>

            <FormField id="add-co-type" label="Entity Type">
              <Select
                id="add-co-type"
                value={form.entityType}
                onChange={e => setForm(f => ({ ...f, entityType: e.target.value }))}
              >
                <option value="pvt_ltd">Private Limited (Pvt Ltd)</option>
                <option value="sole_proprietorship">Sole Proprietorship</option>
                <option value="partnership">Partnership</option>
                <option value="public_ltd">Public Limited (PLC)</option>
                <option value="other">Other / Association</option>
              </Select>
            </FormField>

            <FormField id="add-co-addr" label="Registered Address">
              <Input
                id="add-co-addr"
                placeholder="No. 42, Galle Road, Colombo 03"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              />
            </FormField>

            <FormField id="add-co-contact" label="Official Contact / Mobile">
              <Input
                id="add-co-contact"
                placeholder="+94 11 234 5678"
                value={form.contact}
                onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
              />
            </FormField>

            <Button variant="primary" className="w-full mt-2" onClick={submit}>
              Save Company Profile
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
