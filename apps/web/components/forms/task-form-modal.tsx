'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, SelectInput, TextareaInput, TextInput } from '@/components/forms/field';
import { Modal } from '@/components/modals/modal';
import type { CrmTask, TaskPayload } from '@/lib/storage/types';
import { useCrmData } from '@/hooks/useCrmData';
import { useTranslation } from '@/hooks/useTranslation';
import { addDays, addMonths, toDateTimeLocal } from '@/lib/date-utils';

export function TaskFormModal({
  open,
  task,
  dealId,
  onClose,
  onSubmit,
}: {
  open: boolean;
  task?: CrmTask;
  dealId?: string;
  onClose: () => void;
  onSubmit: (payload: TaskPayload) => void;
}) {
  const { t } = useTranslation();
  const { deals, teamMembers } = useCrmData();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: toDateTimeLocal(new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString()),
    assignedTo: '',
    dealId: '',
  });

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm({
      title: task?.title ?? '',
      description: task?.description ?? '',
      dueDate: task ? toDateTimeLocal(task.dueDate) : toDateTimeLocal(new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString()),
      assignedTo: task?.assignedTo ?? teamMembers[0]?.id ?? '',
      dealId: task?.dealId ?? dealId ?? '',
    });
  }, [dealId, open, task, teamMembers]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.assignedTo || !form.dueDate) {
      setError(t('validation.required'));
      return;
    }
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: new Date(form.dueDate).toISOString(),
      assignedTo: form.assignedTo,
      dealId: form.dealId || undefined,
    });
  }

  function setQuickDate(kind: 'today' | 'tomorrow' | 'threeDays' | 'week' | 'month') {
    const base = new Date();
    base.setHours(18, 0, 0, 0);
    const nextDate =
      kind === 'today'
        ? base
        : kind === 'tomorrow'
          ? addDays(1, base)
          : kind === 'threeDays'
            ? addDays(3, base)
            : kind === 'week'
              ? addDays(7, base)
              : addMonths(1, base);
    setForm((current) => ({ ...current, dueDate: toDateTimeLocal(nextDate) }));
  }

  return (
    <Modal title={task ? t('tasks.editTitle') : t('tasks.createTitle')} open={open} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {error ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
        <Field label={t('tasks.createTitle')}>
          <TextInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </Field>
        <Field label={t('tasks.description')}>
          <TextareaInput value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('tasks.dueDate')}>
            <div className="mb-2 flex flex-wrap gap-2">
              {(['today', 'tomorrow', 'threeDays', 'week', 'month'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-md border bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:border-emerald-600 hover:text-emerald-700"
                  onClick={() => setQuickDate(item)}
                >
                  {t(`tasks.quickDates.${item}`)}
                </button>
              ))}
            </div>
            <TextInput
              type="datetime-local"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
          </Field>
          <Field label={t('tasks.assignedTo')}>
            <SelectInput value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })}>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label={t('tasks.relatedDeal')}>
          <SelectInput value={form.dealId} onChange={(event) => setForm({ ...form, dealId: event.target.value })}>
            <option value="">{t('common.empty')}</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.title}
              </option>
            ))}
          </SelectInput>
        </Field>
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
