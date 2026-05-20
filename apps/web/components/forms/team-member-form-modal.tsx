'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, SelectInput, TextInput } from '@/components/forms/field';
import { Modal } from '@/components/modals/modal';
import type { TeamMember, TeamMemberPayload } from '@/lib/storage/types';
import { useAuth } from '@/hooks/useAuth';
import { useCrmData } from '@/hooks/useCrmData';
import { useTranslation } from '@/hooks/useTranslation';

export function TeamMemberFormModal({
  open,
  member,
  onClose,
  onSubmit,
}: {
  open: boolean;
  member?: TeamMember;
  onClose: () => void;
  onSubmit: (payload: TeamMemberPayload) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const { emailExists } = useAuth();
  const { roles } = useCrmData();
  const [error, setError] = useState('');
  const [form, setForm] = useState<TeamMemberPayload>({
    name: '',
    email: '',
    phone: '',
    role: 'manager',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm({
      name: member?.name ?? '',
      email: member?.email ?? '',
      phone: member?.phone ?? '',
      role: member?.role ?? 'manager',
      password: '',
      confirmPassword: '',
    });
  }, [member, open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError(t('validation.required'));
      return;
    }
    if (!form.email.includes('@')) {
      setError(t('validation.invalidEmail'));
      return;
    }
    if (emailExists(form.email, member?.id)) {
      setError(t('validation.userExists'));
      return;
    }
    if (!member) {
      if (!form.password || form.password.length < 6) {
        setError(t('validation.passwordMin'));
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError(t('validation.passwordMismatch'));
        return;
      }
    }
    await onSubmit({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      role: form.role,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });
  }

  return (
    <Modal title={member ? t('team.editTitle') : t('team.createTitle')} open={open} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {error ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
        <Field label={t('common.name')}>
          <TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('common.email')}>
            <TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <Field label={t('common.phone')}>
            <TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
        </div>
        <Field label={t('common.role')}>
          <SelectInput value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.isDefault ? t(`statuses.${role.id}`) : role.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        {!member ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('auth.password')}>
              <TextInput type="password" value={form.password ?? ''} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </Field>
            <Field label={t('auth.confirmPassword')}>
              <TextInput type="password" value={form.confirmPassword ?? ''} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
            </Field>
          </div>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit">{t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}
