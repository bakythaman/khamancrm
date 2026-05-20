'use client';

import Link from 'next/link';
import { Check, Clock3, Edit3, PhoneCall, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TaskFormModal } from '@/components/forms/task-form-modal';
import { Modal } from '@/components/modals/modal';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { isInPeriod } from '@/lib/date-utils';
import { formatDateTime, isOverdue } from '@/lib/i18n/format';
import { hasPermission } from '@/lib/permissions';
import type { CrmTask } from '@/lib/storage/types';

export type TaskFilter = 'all' | 'active' | 'overdue' | 'done';
export type TaskDueFilter = 'all' | 'today' | 'overdue' | 'week' | 'month';
export type TaskSort = 'newest' | 'created' | 'due' | 'status' | 'assignee' | 'overdue';

export interface TaskListFilters {
  query: string;
  status: TaskFilter;
  due: TaskDueFilter;
  assignedTo: string;
  sort: TaskSort;
}

function compareString(first: string, second: string) {
  return first.localeCompare(second, 'ru');
}

export function TaskList({ filters }: { filters: TaskListFilters }) {
  const { currentUser } = useAuth();
  const { tasks, deals, teamMembers, roles, completeTask, updateTask, deleteTask } = useCrmData();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [editingTask, setEditingTask] = useState<CrmTask | undefined>();
  const [selectedTask, setSelectedTask] = useState<CrmTask | undefined>();
  const canEditTask = hasPermission(currentUser, roles, 'edit_task');
  const canDeleteTask = hasPermission(currentUser, roles, 'delete_task');

  const visibleTasks = useMemo(() => {
    const normalized = filters.query.trim().toLowerCase();

    return tasks
      .filter((task) => {
        const deal = deals.find((item) => item.id === task.dealId);
        const assignee = teamMembers.find((member) => member.id === task.assignedTo);
        const overdue = task.status === 'active' && isOverdue(task.dueDate);
        const searchable = [task.title, task.description, deal?.title, deal?.clientName, assignee?.name, assignee?.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const matchesQuery = !normalized || searchable.includes(normalized);
        const matchesStatus =
          filters.status === 'all' ||
          (filters.status === 'overdue' ? overdue : task.status === filters.status);
        const matchesAssignee = filters.assignedTo === 'all' || task.assignedTo === filters.assignedTo;
        const matchesDue =
          filters.due === 'all' ||
          (filters.due === 'overdue'
            ? overdue
            : filters.due === 'today'
              ? isInPeriod(task.dueDate, 'day')
              : filters.due === 'week'
                ? isInPeriod(task.dueDate, 'week')
                : isInPeriod(task.dueDate, 'month'));
        return matchesQuery && matchesStatus && matchesAssignee && matchesDue;
      })
      .sort((first, second) => {
        if (filters.sort === 'due') return new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime();
        if (filters.sort === 'created') return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
        if (filters.sort === 'status') return compareString(first.status, second.status);
        if (filters.sort === 'assignee') {
          const firstOwner = teamMembers.find((member) => member.id === first.assignedTo)?.name ?? '';
          const secondOwner = teamMembers.find((member) => member.id === second.assignedTo)?.name ?? '';
          return compareString(firstOwner, secondOwner);
        }
        if (filters.sort === 'overdue') {
          const firstOverdue = first.status === 'active' && isOverdue(first.dueDate) ? 0 : 1;
          const secondOverdue = second.status === 'active' && isOverdue(second.dueDate) ? 0 : 1;
          return firstOverdue - secondOverdue || new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime();
        }
        return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
      });
  }, [deals, filters, tasks, teamMembers]);

  async function handleDelete(task: CrmTask) {
    const confirmed = await confirm({
      title: t('tasks.deleteTitle'),
      message: t('tasks.deleteMessage'),
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;
    deleteTask(task.id);
    setSelectedTask(undefined);
    showToast(t('tasks.taskDeleted'));
  }

  function handleComplete(task: CrmTask) {
    completeTask(task.id);
    setSelectedTask((current) => (current?.id === task.id ? { ...current, status: 'done' } : current));
    showToast(t('tasks.taskCompleted'));
  }

  if (!visibleTasks.length) {
    return <EmptyState icon={Clock3} title={t('common.notFound')} description={t('tasks.noTasks')} />;
  }

  return (
    <>
      <div className="space-y-3">
        {visibleTasks.map((task) => {
          const assignee = teamMembers.find((member) => member.id === task.assignedTo);
          const deal = deals.find((item) => item.id === task.dealId);
          const overdue = task.status === 'active' && isOverdue(task.dueDate);

          return (
            <Card key={task.id} className="overflow-hidden p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white text-neutral-400 transition hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                  title={t('buttons.complete')}
                  disabled={task.status === 'done' || !canEditTask}
                  onClick={() => handleComplete(task)}
                >
                  <Check className="h-4 w-4" aria-hidden />
                </button>
                <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedTask(task)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-950">{task.title}</p>
                    <Badge tone={task.status === 'done' ? 'green' : overdue ? 'rose' : 'neutral'}>
                      {task.status === 'done' ? t('statuses.done') : overdue ? t('statuses.overdue') : t('statuses.active')}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden />
                      {formatDateTime(task.dueDate)}
                    </span>
                    {deal ? <span>{deal.clientName}</span> : null}
                    {task.description ? <span className="line-clamp-1">{task.description}</span> : null}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <Avatar name={assignee?.name ?? 'Khaman'} className="h-7 w-7 text-[11px]" />
                  {canEditTask ? (
                    <Button variant="ghost" size="icon" title={t('common.edit')} onClick={() => setEditingTask(task)}>
                      <Edit3 className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="icon" title={t('buttons.call')} onClick={() => showToast(t('notifications.telephonySoon'), 'info')}>
                    <PhoneCall className="h-4 w-4" aria-hidden />
                  </Button>
                  {canDeleteTask ? (
                    <Button variant="ghost" size="icon" title={t('common.delete')} onClick={() => void handleDelete(task)}>
                      <Trash2 className="h-4 w-4 text-rose-600" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal title={t('tasks.detailsTitle')} open={Boolean(selectedTask)} onClose={() => setSelectedTask(undefined)}>
        {selectedTask ? (
          <CardContent className="space-y-4 p-0">
            <div>
              <h3 className="text-base font-semibold text-neutral-950">{selectedTask.title}</h3>
              <p className="mt-1 text-sm text-neutral-500">{selectedTask.description || t('common.empty')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoLine label={t('common.status')} value={selectedTask.status === 'done' ? t('statuses.done') : isOverdue(selectedTask.dueDate) ? t('statuses.overdue') : t('statuses.active')} />
              <InfoLine label={t('tasks.dueDate')} value={formatDateTime(selectedTask.dueDate)} />
              <InfoLine label={t('tasks.assignedTo')} value={teamMembers.find((member) => member.id === selectedTask.assignedTo)?.name ?? t('common.manager')} />
              <InfoLine label={t('tasks.createdAt')} value={formatDateTime(selectedTask.createdAt)} />
            </div>
            {selectedTask.dealId ? (
              <Button variant="outline" asChild>
                <Link href={`/deals/${selectedTask.dealId}`}>{t('tasks.openDeal')}</Link>
              </Button>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              {canEditTask ? (
                <>
                  <Button variant="outline" onClick={() => setEditingTask(selectedTask)}>
                    {t('common.edit')}
                  </Button>
                  <Button variant="outline" disabled={selectedTask.status === 'done'} onClick={() => handleComplete(selectedTask)}>
                    {t('buttons.complete')}
                  </Button>
                </>
              ) : null}
              {canDeleteTask ? (
                <Button variant="danger" onClick={() => void handleDelete(selectedTask)}>
                  {t('common.delete')}
                </Button>
              ) : null}
            </div>
          </CardContent>
        ) : null}
      </Modal>

      <TaskFormModal
        open={Boolean(editingTask)}
        task={editingTask}
        onClose={() => setEditingTask(undefined)}
        onSubmit={(payload) => {
          if (!editingTask) return;
          updateTask(editingTask.id, payload);
          setSelectedTask((current) => (current?.id === editingTask.id ? { ...editingTask, ...payload } : current));
          setEditingTask(undefined);
          showToast(t('tasks.taskUpdated'));
        }}
      />
    </>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-neutral-50 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-neutral-950">{value}</p>
    </div>
  );
}
