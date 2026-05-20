'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { AnalyticsView } from '@/components/analytics/analytics-view';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { buildAnalyticsCsv } from '@/lib/analytics';
import type { AnalyticsPeriod } from '@/lib/date-utils';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/lib/permissions';

export default function AnalyticsPage() {
  const { currentUser } = useAuth();
  const { deals, tasks, teamMembers, pipelineStages, roles } = useCrmData();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<AnalyticsPeriod>('week');
  const [managerId, setManagerId] = useState('all');
  const canExport = hasPermission(currentUser, roles, 'export_analytics');

  function exportCsv() {
    const csv = buildAnalyticsCsv({ deals, tasks, team: teamMembers, stages: pipelineStages, period });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'analytics-export.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast(t('analytics.exported'));
  }

  return (
    <div>
      <PageHeader
        title={t('analytics.title')}
        eyebrow={t('analytics.subtitle')}
        action={
          <div className="flex flex-wrap gap-2">
            {(['day', 'week', 'month', 'all'] as const).map((item) => (
              <Button key={item} variant={period === item ? 'secondary' : 'outline'} onClick={() => setPeriod(item)}>
                {t(`analytics.${item}`)}
              </Button>
            ))}
            <select
              value={managerId}
              onChange={(event) => setManagerId(event.target.value)}
              className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">{t('pipeline.allManagers')}</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            {canExport ? (
              <Button variant="outline" onClick={exportCsv}>
                <Download className="h-4 w-4" aria-hidden />
                {t('buttons.export')}
              </Button>
            ) : null}
          </div>
        }
      />
      <AnalyticsView period={period} managerId={managerId} />
    </div>
  );
}
