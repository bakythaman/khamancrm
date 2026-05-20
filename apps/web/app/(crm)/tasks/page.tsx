'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { TaskFormModal } from '@/components/forms/task-form-modal';
import { PageHeader } from '@/components/layout/page-header';
import { TaskList, type TaskDueFilter, type TaskFilter, type TaskListFilters, type TaskSort } from '@/components/tasks/task-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { hasPermission } from '@/lib/permissions';
import { isOverdue } from '@/lib/i18n/format';
import { readString, writeString } from '@/lib/storage/local-store';

export default function TasksPage() {
  const { currentUser } = useAuth();
  const { tasks, teamMembers, roles, createTask } = useCrmData();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<TaskListFilters>({
    query: '',
    status: 'all',
    due: 'all',
    assignedTo: 'all',
    sort: (readString('khaman.taskSort') as TaskSort | null) ?? 'newest',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const overdueCount = tasks.filter((task) => task.status === 'active' && isOverdue(task.dueDate)).length;
  const activeCount = tasks.filter((task) => task.status === 'active').length;
  const canCreateTask = hasPermission(currentUser, roles, 'create_task');

  function updateFilter<Key extends keyof TaskListFilters>(key: Key, value: TaskListFilters[Key]) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === 'sort') writeString('khaman.taskSort', String(value));
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title={t('tasks.title')}
        eyebrow={t('tasks.subtitle')}
        action={
          canCreateTask ? (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              {t('buttons.newTask')}
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'active', 'overdue', 'done'] as const).map((item) => (
          <button key={item} onClick={() => updateFilter('status', item)}>
            <Badge tone={filters.status === item ? 'green' : item === 'overdue' ? 'rose' : 'neutral'}>
              {item === 'all' ? t('common.all') : t(`statuses.${item}`)}
            </Badge>
          </button>
        ))}
        <Badge tone="rose">
          {overdueCount} {t('statuses.overdue')}
        </Badge>
        <Badge tone="blue">
          {activeCount} {t('statuses.active')}
        </Badge>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-[1fr_repeat(4,180px)]">
        <Input value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder={t('tasks.searchPlaceholder')} />
        <select
          value={filters.assignedTo}
          onChange={(event) => updateFilter('assignedTo', event.target.value)}
          className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="all">{t('pipeline.allManagers')}</option>
          {teamMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <select
          value={filters.due}
          onChange={(event) => updateFilter('due', event.target.value as TaskDueFilter)}
          className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        >
          {(['all', 'today', 'overdue', 'week', 'month'] as const).map((item) => (
            <option key={item} value={item}>
              {item === 'all' ? t('common.all') : t(`tasks.dueFilters.${item}`)}
            </option>
          ))}
        </select>
        <select
          value={filters.sort}
          onChange={(event) => updateFilter('sort', event.target.value as TaskSort)}
          className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        >
          {(['newest', 'created', 'due', 'status', 'assignee', 'overdue'] as const).map((item) => (
            <option key={item} value={item}>
              {t(`tasks.sort.${item}`)}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(event) => updateFilter('status', event.target.value as TaskFilter)}
          className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        >
          {(['all', 'active', 'overdue', 'done'] as const).map((item) => (
            <option key={item} value={item}>
              {item === 'all' ? t('common.all') : t(`statuses.${item}`)}
            </option>
          ))}
        </select>
      </div>

      <TaskList filters={filters} />
      <TaskFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(payload) => {
          createTask(payload);
          setModalOpen(false);
          showToast(t('tasks.taskCreated'));
        }}
      />
    </div>
  );
}
