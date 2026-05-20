import { CheckCircle2, Clock, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCrmData } from '@/hooks/useCrmData';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime, isOverdue } from '@/lib/i18n/format';

export function FocusList() {
  const { tasks, deals } = useCrmData();
  const { t } = useTranslation();
  const visibleTasks = tasks
    .filter((task) => task.status === 'active')
    .sort((first, second) => new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime())
    .slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t('dashboard.today')}</CardTitle>
          <p className="mt-1 text-sm text-neutral-500">{t('dashboard.todaySubtitle')}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/tasks">{t('dashboard.openTasks')}</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleTasks.length ? (
          visibleTasks.map((task) => {
            const deal = deals.find((item) => item.id === task.dealId);
            const overdue = isOverdue(task.dueDate);

            return (
              <div key={task.id} className="flex items-center gap-3 rounded-lg border bg-white p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
                  {overdue ? (
                    <Clock className="h-4 w-4 text-rose-600" aria-hidden />
                  ) : task.dealId ? (
                    <MessageCircle className="h-4 w-4 text-emerald-700" aria-hidden />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-neutral-700" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-950">{task.title}</p>
                  <p className="text-xs text-neutral-500">
                    {deal?.clientName ?? t('common.empty')} - {formatDateTime(task.dueDate)}
                  </p>
                </div>
                <Badge tone={overdue ? 'rose' : 'neutral'}>{overdue ? t('statuses.overdue') : t('statuses.active')}</Badge>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border bg-neutral-50 p-5 text-sm text-neutral-500">{t('tasks.noTasks')}</div>
        )}
      </CardContent>
    </Card>
  );
}
