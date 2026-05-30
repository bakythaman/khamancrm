'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Bot, CalendarClock, CheckCircle2, Edit3, MessageCircle, Phone, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DealFormModal } from '@/components/forms/deal-form-modal';
import { TaskFormModal } from '@/components/forms/task-form-modal';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { formatAmount, formatDateTime } from '@/lib/i18n/format';
import { hasPermission } from '@/lib/permissions';
import type { DealStatus } from '@/lib/storage/types';

export default function DealDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const { deals, tasks, teamMembers, pipelineStages, roles, updateDeal, deleteDeal, addComment, createTask } = useCrmData();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [comment, setComment] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const deal = deals.find((item) => item.id === searchParams.get('id'));

  if (!deal) {
    return (
      <EmptyState
        icon={Trash2}
        title={t('common.notFound')}
        description={t('pipeline.noDeals')}
        className="min-h-[420px]"
      />
    );
  }

  const currentDeal = deal;
  const owner = teamMembers.find((member) => member.id === currentDeal.assignedTo);
  const relatedTasks = tasks.filter((task) => task.dealId === currentDeal.id);
  const canEditDeal = hasPermission(currentUser, roles, 'edit_deal');
  const canDeleteDeal = hasPermission(currentUser, roles, 'delete_deal');
  const canCreateTask = hasPermission(currentUser, roles, 'create_task');

  async function handleDelete() {
    const confirmed = await confirm({
      title: t('pipeline.deleteTitle'),
      message: t('pipeline.deleteMessage'),
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;
    deleteDeal(currentDeal.id);
    showToast(t('pipeline.dealDeleted'));
    router.push('/pipeline');
  }

  function saveComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim()) return;
    addComment(currentDeal.id, comment);
    setComment('');
    showToast(t('notifications.saved'));
  }

  return (
    <div>
      <Link href="/pipeline" className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('navigation.pipeline')}
      </Link>

      <PageHeader
        title={currentDeal.title}
        eyebrow={`${currentDeal.clientName} - ${currentDeal.phone}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => showToast(t('notifications.telephonySoon'), 'info')}>
              <Phone className="h-4 w-4" aria-hidden />
              {t('buttons.call')}
            </Button>
            {canEditDeal ? (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Edit3 className="h-4 w-4" aria-hidden />
                {t('common.edit')}
              </Button>
            ) : null}
            <Button onClick={() => showToast(t('notifications.whatsappSoon'), 'info')}>
              <MessageCircle className="h-4 w-4" aria-hidden />
              {t('buttons.whatsapp')}
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t('deals.details')}</CardTitle>
                <p className="mt-1 text-sm text-neutral-500">{formatAmount(currentDeal.amount)}</p>
              </div>
              <Badge tone={currentDeal.status === 'lost' ? 'rose' : currentDeal.status === 'won' ? 'green' : 'neutral'}>
                {t(`statuses.${currentDeal.status}`)}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <label className="rounded-lg border bg-neutral-50 p-3">
                <span className="text-sm text-neutral-500">{t('common.status')}</span>
                <select
                  value={currentDeal.status}
                  disabled={!canEditDeal}
                  onChange={(event) => {
                    updateDeal(currentDeal.id, { status: event.target.value as DealStatus });
                    showToast(t('deals.statusChanged'));
                  }}
                  className="mt-2 h-9 w-full rounded-md border bg-white px-2 text-sm outline-none"
                >
                  {(['active', 'won', 'lost'] as const).map((status) => (
                    <option key={status} value={status}>
                      {t(`statuses.${status}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rounded-lg border bg-neutral-50 p-3">
                <span className="text-sm text-neutral-500">{t('pipeline.assignedTo')}</span>
                <select
                  value={currentDeal.assignedTo}
                  disabled={!canEditDeal}
                  onChange={(event) => {
                    updateDeal(currentDeal.id, { assignedTo: event.target.value });
                    showToast(t('deals.ownerChanged'));
                  }}
                  className="mt-2 h-9 w-full rounded-md border bg-white px-2 text-sm outline-none"
                >
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rounded-lg border bg-neutral-50 p-3">
                <span className="text-sm text-neutral-500">{t('pipeline.stage')}</span>
                <select
                  value={currentDeal.stageId}
                  disabled={!canEditDeal}
                  onChange={(event) => {
                    updateDeal(currentDeal.id, { stageId: event.target.value });
                    showToast(t('pipeline.stageChanged'));
                  }}
                  className="mt-2 h-9 w-full rounded-md border bg-white px-2 text-sm outline-none"
                >
                  {pipelineStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.isDefault ? t(`stages.${stage.id}`) : stage.name}
                    </option>
                  ))}
                </select>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('deals.comments')}</CardTitle>
              {canCreateTask ? (
                <Button variant="outline" size="sm" onClick={() => setTaskOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  {t('buttons.newTask')}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <form className="flex gap-2" onSubmit={saveComment}>
                <input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t('deals.commentPlaceholder')}
                  className="h-10 flex-1 rounded-md border bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
                <Button>{t('buttons.addComment')}</Button>
              </form>
              {currentDeal.comments.length ? (
                currentDeal.comments.map((item) => {
                  const author = teamMembers.find((member) => member.id === item.authorId);
                  return (
                    <div key={item.id} className="flex gap-3 rounded-lg border bg-white p-3">
                      <Avatar name={author?.name ?? 'Khaman'} src={author?.avatarDataUrl} className="h-8 w-8 text-[11px]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-neutral-950">{author?.name ?? 'Khaman'}</p>
                          <span className="text-xs text-neutral-400">{formatDateTime(item.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-neutral-500">{item.text}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-lg border bg-neutral-50 p-4 text-sm text-neutral-500">{t('deals.noComments')}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t('deals.contact')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={currentDeal.clientName} className="h-10 w-10" />
                <div>
                  <p className="text-sm font-semibold text-neutral-950">{currentDeal.clientName}</p>
                  <p className="text-sm text-neutral-500">{currentDeal.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => showToast(t('notifications.telephonySoon'), 'info')}>
                  <Phone className="h-4 w-4" aria-hidden />
                  {t('buttons.call')}
                </Button>
                <Button variant="outline" onClick={() => showToast(t('notifications.whatsappSoon'), 'info')}>
                  <MessageCircle className="h-4 w-4 text-emerald-700" aria-hidden />
                  {t('buttons.whatsapp')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('tasks.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {relatedTasks.length ? (
                relatedTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 rounded-lg border bg-white p-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-950">{task.title}</p>
                      <p className="text-xs text-neutral-500">{formatDateTime(task.dueDate)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border bg-neutral-50 p-4 text-sm text-neutral-500">{t('tasks.noTasks')}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('inbox.aiSummary')}</CardTitle>
              <Bot className="h-4 w-4 text-neutral-500" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">{t('inbox.aiSummaryText')}</p>
              <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
                <CalendarClock className="h-4 w-4" aria-hidden />
                {owner?.name ?? t('common.manager')}
              </div>
            </CardContent>
          </Card>

          {canDeleteDeal ? (
            <Button variant="danger" className="w-full" onClick={() => void handleDelete()}>
              <Trash2 className="h-4 w-4" aria-hidden />
              {t('common.delete')}
            </Button>
          ) : null}
        </aside>
      </div>

      <DealFormModal
        open={editOpen}
        deal={currentDeal}
        onClose={() => setEditOpen(false)}
        onSubmit={(payload) => {
          updateDeal(currentDeal.id, payload);
          setEditOpen(false);
          showToast(t('pipeline.dealUpdated'));
        }}
      />

      <TaskFormModal
        open={taskOpen}
        dealId={currentDeal.id}
        onClose={() => setTaskOpen(false)}
        onSubmit={(payload) => {
          createTask(payload);
          setTaskOpen(false);
          showToast(t('deals.taskAdded'));
        }}
      />
    </div>
  );
}
