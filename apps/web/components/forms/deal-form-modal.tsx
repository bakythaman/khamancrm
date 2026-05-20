'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, SelectInput, TextInput } from '@/components/forms/field';
import { Modal } from '@/components/modals/modal';
import type { Deal, DealPayload, DealStatus } from '@/lib/storage/types';
import { useCrmData } from '@/hooks/useCrmData';
import { useTranslation } from '@/hooks/useTranslation';

interface DealFormState {
  title: string;
  clientName: string;
  phone: string;
  amount: string;
  stageId: string;
  status: DealStatus;
  assignedTo: string;
}

export function DealFormModal({
  open,
  deal,
  onClose,
  onSubmit,
}: {
  open: boolean;
  deal?: Deal;
  onClose: () => void;
  onSubmit: (payload: DealPayload) => void;
}) {
  const { t } = useTranslation();
  const { pipelineStages, teamMembers } = useCrmData();
  const [error, setError] = useState('');
  const [form, setForm] = useState<DealFormState>({
    title: '',
    clientName: '',
    phone: '',
    amount: '',
    stageId: 'new',
    status: 'active',
    assignedTo: '',
  });

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm({
      title: deal?.title ?? '',
      clientName: deal?.clientName ?? '',
      phone: deal?.phone ?? '',
      amount: deal ? String(deal.amount) : '',
      stageId: deal?.stageId ?? pipelineStages[0]?.id ?? 'new',
      status: deal?.status ?? 'active',
      assignedTo: deal?.assignedTo ?? teamMembers[0]?.id ?? '',
    });
  }, [deal, open, pipelineStages, teamMembers]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !form.clientName.trim() || !form.phone.trim() || !form.assignedTo) {
      setError(t('validation.required'));
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('validation.amountPositive'));
      return;
    }
    onSubmit({
      title: form.title.trim(),
      clientName: form.clientName.trim(),
      phone: form.phone.trim(),
      amount,
      stageId: form.stageId,
      status: form.status,
      assignedTo: form.assignedTo,
    });
  }

  return (
    <Modal title={deal ? t('pipeline.editTitle') : t('pipeline.createTitle')} open={open} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {error ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
        <Field label={t('pipeline.createTitle')}>
          <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('pipeline.clientName')}>
            <TextInput value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} />
          </Field>
          <Field label={t('common.phone')}>
            <TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('common.amount')}>
            <TextInput type="number" min={1} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          </Field>
          <Field label={t('pipeline.assignedTo')}>
            <SelectInput value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })}>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('pipeline.stage')}>
            <SelectInput value={form.stageId} onChange={(event) => setForm({ ...form, stageId: event.target.value })}>
              {pipelineStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.isDefault ? t(`stages.${stage.id}`) : stage.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t('common.status')}>
            <SelectInput value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as DealStatus })}>
              {(['active', 'won', 'lost'] as const).map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}`)}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
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
