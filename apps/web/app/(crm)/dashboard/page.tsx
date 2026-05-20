'use client';

import { BarChart3, Clock3, DollarSign, MessageCircle, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DealFormModal } from '@/components/forms/deal-form-modal';
import { FocusList } from '@/components/dashboard/focus-list';
import { HotConversations } from '@/components/dashboard/hot-conversations';
import { MetricCard } from '@/components/dashboard/metric-card';
import { PipelineSnapshot } from '@/components/dashboard/pipeline-snapshot';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { calculateAnalytics } from '@/lib/analytics';
import type { AnalyticsPeriod } from '@/lib/date-utils';
import { formatAmount } from '@/lib/i18n/format';
import { hasPermission } from '@/lib/permissions';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { deals, tasks, teamMembers, pipelineStages, roles, createDeal } = useCrmData();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<AnalyticsPeriod>('week');
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const canCreateDeal = hasPermission(currentUser, roles, 'create_deal');

  const metrics = useMemo(() => {
    const analytics = calculateAnalytics(deals, tasks, teamMembers, pipelineStages, period);
    return {
      revenue: analytics.revenue,
      conversion: analytics.conversion,
      taskCompletion: analytics.tasks.completionRate,
      openChats: deals.filter((deal) => deal.status === 'active').length,
      activeTasks: analytics.tasks.active,
    };
  }, [deals, period, pipelineStages, tasks, teamMembers]);

  return (
    <div>
      <PageHeader
        title={t('dashboard.title', { name: currentUser?.name.split(' ')[0] ?? 'Khaman' })}
        eyebrow={t('dashboard.eyebrow')}
        action={
          <div className="flex flex-wrap gap-2">
            {(['day', 'week', 'month', 'all'] as const).map((item) => (
              <Button key={item} variant={period === item ? 'secondary' : 'outline'} onClick={() => setPeriod(item)}>
                {t(`analytics.${item}`)}
              </Button>
            ))}
            {canCreateDeal ? (
              <Button onClick={() => setDealModalOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                {t('buttons.addLead')}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title={t('dashboard.revenue')} value={formatAmount(metrics.revenue)} change={t('dashboard.activeValue')} icon={DollarSign} tone="green" />
        <MetricCard title={t('dashboard.responseTime')} value="11m" change={t('notifications.whatsappSoon')} icon={Clock3} tone="blue" />
        <MetricCard title={t('dashboard.openChats')} value={String(metrics.openChats)} change={t('inbox.comingSoon')} icon={MessageCircle} tone="green" />
        <MetricCard title={t('dashboard.conversion')} value={`${metrics.conversion}%`} change={t('dashboard.salesConversion')} icon={BarChart3} tone="amber" />
        <MetricCard title={t('dashboard.taskCompletion')} value={`${metrics.taskCompletion}%`} change={`${metrics.activeTasks} ${t('dashboard.completedTasksHint')}`} icon={BarChart3} tone="blue" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <FocusList />
        <PipelineSnapshot />
      </div>

      <div className="mt-5">
        <HotConversations />
      </div>

      <DealFormModal
        open={dealModalOpen}
        onClose={() => setDealModalOpen(false)}
        onSubmit={(payload) => {
          createDeal(payload);
          setDealModalOpen(false);
          showToast(t('pipeline.dealCreated'));
        }}
      />
    </div>
  );
}
