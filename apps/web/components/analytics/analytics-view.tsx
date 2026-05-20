'use client';

import Link from 'next/link';
import { Activity, BarChart3, CheckSquare, Clock3, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Modal } from '@/components/modals/modal';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useCrmData } from '@/hooks/useCrmData';
import { useTranslation } from '@/hooks/useTranslation';
import { calculateAnalytics } from '@/lib/analytics';
import type { AnalyticsPeriod } from '@/lib/date-utils';
import { formatAmount, formatDateTime } from '@/lib/i18n/format';

export function AnalyticsView({ period, managerId }: { period: AnalyticsPeriod; managerId: string }) {
  const { deals, tasks, teamMembers, pipelineStages } = useCrmData();
  const { t } = useTranslation();
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);

  const filteredDeals = useMemo(
    () => (managerId === 'all' ? deals : deals.filter((deal) => deal.assignedTo === managerId)),
    [deals, managerId],
  );
  const filteredTasks = useMemo(
    () => (managerId === 'all' ? tasks : tasks.filter((task) => task.assignedTo === managerId)),
    [managerId, tasks],
  );
  const filteredTeam = useMemo(
    () => (managerId === 'all' ? teamMembers : teamMembers.filter((member) => member.id === managerId)),
    [managerId, teamMembers],
  );

  const analytics = useMemo(
    () => calculateAnalytics(filteredDeals, filteredTasks, filteredTeam, pipelineStages, period),
    [filteredDeals, filteredTasks, filteredTeam, period, pipelineStages],
  );
  const managerStats = analytics.managers;
  const selectedManager = managerStats.find((item) => item.member.id === selectedManagerId);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title={t('analytics.sales')} value={formatAmount(analytics.revenue)} change={t(`analytics.revenueSource.${analytics.revenueSource}`)} icon={TrendingUp} tone="green" />
        <MetricCard title={t('analytics.dealsCount')} value={String(analytics.dealsCount)} change={t(`analytics.${period}`)} icon={Activity} tone="blue" />
        <MetricCard title={t('analytics.wonDeals')} value={String(analytics.wonDeals)} change={`${analytics.lostDeals} ${t('analytics.lostLeads')}`} icon={BarChart3} tone="green" />
        <MetricCard title={t('analytics.conversion')} value={`${analytics.conversion}%`} change={t('dashboard.salesConversion')} icon={BarChart3} tone="amber" />
        <MetricCard title={t('analytics.averageDeal')} value={formatAmount(analytics.averageDeal)} change={t('analytics.wonDeals')} icon={TrendingUp} tone="green" />
        <MetricCard title={t('analytics.activeTasks')} value={String(analytics.tasks.active)} change={`${analytics.tasks.completed} ${t('statuses.done')}`} icon={CheckSquare} tone="blue" />
        <MetricCard title={t('analytics.overdueTasks')} value={String(analytics.tasks.overdue)} change={`${analytics.tasks.completionRate}% ${t('dashboard.completedTasksHint')}`} icon={Clock3} tone="amber" />
        <MetricCard title={t('analytics.lostLeads')} value={`${analytics.lostDeals}`} change={t('analytics.lostDealsHint')} icon={TrendingDown} tone="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t('analytics.managerActivity')}</CardTitle>
              <p className="mt-1 text-sm text-neutral-500">{t('team.subtitle')}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {managerStats.length ? (
              managerStats.map((manager) => {
                const score = Math.min(100, manager.dealsCount * 18 + manager.tasksCount * 8 + manager.completedTasks * 6);

                return (
                  <button
                    key={manager.member.id}
                    className="w-full space-y-2 rounded-lg border bg-white p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/30"
                    onClick={() => setSelectedManagerId(manager.member.id)}
                  >
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 font-semibold text-neutral-950">
                        <Avatar name={manager.member.name} className="h-7 w-7 text-[11px]" />
                        {manager.member.name}
                      </span>
                      <span className="text-neutral-500">
                        {manager.dealsCount} {t('analytics.deals')}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_96px] items-center gap-3">
                      <Progress value={score} />
                      <span className="text-sm text-neutral-500">
                        {manager.tasksCount} {t('navigation.tasks')}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-lg border bg-neutral-50 p-5 text-sm text-neutral-500">{t('common.empty')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.source')}</CardTitle>
            <Activity className="h-4 w-4 text-neutral-500" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: t('buttons.whatsapp'), value: filteredDeals.length ? 62 : 0, color: 'bg-emerald-600' },
              { label: t('buttons.call'), value: filteredDeals.length ? 21 : 0, color: 'bg-blue-500' },
              { label: t('common.company'), value: filteredDeals.length ? 11 : 0, color: 'bg-amber-500' },
              { label: t('common.empty'), value: filteredDeals.length ? 6 : 0, color: 'bg-neutral-700' },
            ].map((source) => (
              <div key={source.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-neutral-800">{source.label}</span>
                  <span className="text-neutral-500">{source.value}%</span>
                </div>
                <Progress value={source.value} barClassName={source.color} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Modal title={t('analytics.managerDetails')} open={Boolean(selectedManager)} onClose={() => setSelectedManagerId(null)}>
        {selectedManager ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={selectedManager.member.name} />
              <div>
                <h3 className="text-base font-semibold text-neutral-950">{selectedManager.member.name}</h3>
                <p className="text-sm text-neutral-500">{selectedManager.member.email}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label={t('analytics.sales')} value={formatAmount(selectedManager.revenue)} />
              <Info label={t('analytics.conversion')} value={`${selectedManager.conversion}%`} />
              <Info label={t('navigation.tasks')} value={String(selectedManager.tasksCount)} />
              <Info label={t('analytics.overdueTasks')} value={String(selectedManager.overdueTasks)} />
              <Info label={t('analytics.completedTasks')} value={String(selectedManager.completedTasks)} />
              <Info label={t('analytics.responseTime')} value={selectedManager.averageResponseTime} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-neutral-950">{t('analytics.latestDeals')}</h4>
                <div className="space-y-2">
                  {selectedManager.deals.slice(0, 4).map((deal) => (
                    <Link key={deal.id} href={`/deals?id=${encodeURIComponent(deal.id)}`} className="block rounded-lg border bg-white p-3 text-sm hover:bg-neutral-50">
                      <span className="font-medium text-neutral-950">{deal.title}</span>
                      <span className="mt-1 block text-neutral-500">{formatAmount(deal.amount)}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-neutral-950">{t('analytics.latestTasks')}</h4>
                <div className="space-y-2">
                  {selectedManager.tasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="rounded-lg border bg-white p-3 text-sm">
                      <span className="font-medium text-neutral-950">{task.title}</span>
                      <span className="mt-1 block text-neutral-500">{formatDateTime(task.dueDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedManagerId(null)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-neutral-50 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
