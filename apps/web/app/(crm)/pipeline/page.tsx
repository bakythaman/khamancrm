'use client';

import { Filter, Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DealFormModal } from '@/components/forms/deal-form-modal';
import { PageHeader } from '@/components/layout/page-header';
import { PipelineBoard, type PipelineFilters } from '@/components/pipeline/pipeline-board';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { hasPermission } from '@/lib/permissions';
import type { DealStatus } from '@/lib/storage/types';

export default function PipelinePage() {
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const { createDeal, pipelineStages, teamMembers, roles } = useCrmData();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<PipelineFilters>({
    query: searchParams.get('search') ?? '',
    stageId: 'all',
    assignedTo: 'all',
    status: 'all',
    minAmount: '',
  });
  const canCreateDeal = hasPermission(currentUser, roles, 'create_deal');

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setFiltersOpen(true);
      setFilters((current) => ({ ...current, query: search }));
    }
  }, [searchParams]);

  function updateFilter<Key extends keyof PipelineFilters>(key: Key, value: PipelineFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div>
      <PageHeader
        title={t('pipeline.title')}
        eyebrow={t('pipeline.subtitle')}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFiltersOpen((current) => !current);
                showToast(t('notifications.filtersApplied'), 'info');
              }}
            >
              <Filter className="h-4 w-4" aria-hidden />
              {t('buttons.filter')}
            </Button>
            {canCreateDeal ? (
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                {t('buttons.newDeal')}
              </Button>
            ) : null}
          </div>
        }
      />
      {filtersOpen ? (
        <div className="mb-4 grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-[1fr_repeat(4,180px)]">
          <Input
            value={filters.query}
            onChange={(event) => updateFilter('query', event.target.value)}
            placeholder={t('pipeline.searchPlaceholder')}
          />
          <select
            value={filters.stageId}
            onChange={(event) => updateFilter('stageId', event.target.value)}
            className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">{t('common.all')}</option>
            {pipelineStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.isDefault ? t(`stages.${stage.id}`) : stage.name}
              </option>
            ))}
          </select>
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
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value as DealStatus | 'all')}
            className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">{t('common.status')}</option>
            {(['active', 'won', 'lost'] as const).map((status) => (
              <option key={status} value={status}>
                {t(`statuses.${status}`)}
              </option>
            ))}
          </select>
          <Input
            type="number"
            min={0}
            value={filters.minAmount}
            onChange={(event) => updateFilter('minAmount', event.target.value)}
            placeholder={t('pipeline.minAmount')}
          />
        </div>
      ) : null}
      <PipelineBoard filters={filters} />
      <DealFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(payload) => {
          createDeal(payload);
          setModalOpen(false);
          showToast(t('pipeline.dealCreated'));
        }}
      />
    </div>
  );
}
