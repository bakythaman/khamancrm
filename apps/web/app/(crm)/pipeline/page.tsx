'use client';

import { ArrowDown, ArrowUp, Bot, Filter, Megaphone, Plus, Trash2, Workflow, Zap } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DealFormModal } from '@/components/forms/deal-form-modal';
import { PageHeader } from '@/components/layout/page-header';
import { PipelineBoard, type PipelineFilters } from '@/components/pipeline/pipeline-board';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { hasPermission } from '@/lib/permissions';
import type { DealStatus, PipelineAutomation, PipelineAutomationType, PipelineStage } from '@/lib/storage/types';

const stageColors = ['#64748b', '#2563eb', '#d97706', '#059669', '#e11d48', '#7c3aed'] as const;
const automationTypes: PipelineAutomationType[] = ['robot', 'trigger', 'broadcast'];

export default function PipelinePage() {
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const {
    deals,
    createDeal,
    pipelineStages,
    pipelineAutomations,
    teamMembers,
    roles,
    createPipelineStage,
    updatePipelineStage,
    reorderPipelineStage,
    deletePipelineStage,
    createPipelineAutomation,
    updatePipelineAutomation,
    deletePipelineAutomation,
  } = useCrmData();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [view, setView] = useState<'board' | 'stages' | 'automation'>('board');
  const [modalOpen, setModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState<string>(stageColors[0]);
  const [automationForm, setAutomationForm] = useState({
    type: 'robot' as PipelineAutomationType,
    name: '',
    stageId: pipelineStages[0]?.id ?? 'new',
    message: '',
  });
  const [filters, setFilters] = useState<PipelineFilters>({
    query: searchParams.get('search') ?? '',
    stageId: 'all',
    assignedTo: 'all',
    status: 'all',
    minAmount: '',
  });
  const canCreateDeal = hasPermission(currentUser, roles, 'create_deal');
  const canManagePipeline = hasPermission(currentUser, roles, 'manage_pipeline');
  const sortedStages = useMemo(() => [...pipelineStages].sort((a, b) => a.order - b.order), [pipelineStages]);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setFiltersOpen(true);
      setFilters((current) => ({ ...current, query: search }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!pipelineStages.some((stage) => stage.id === automationForm.stageId)) {
      setAutomationForm((current) => ({ ...current, stageId: pipelineStages[0]?.id ?? 'new' }));
    }
  }, [automationForm.stageId, pipelineStages]);

  function updateFilter<Key extends keyof PipelineFilters>(key: Key, value: PipelineFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function createStage() {
    if (!newStageName.trim()) {
      showToast(t('validation.required'), 'danger');
      return;
    }
    createPipelineStage(newStageName, newStageColor);
    setNewStageName('');
    setNewStageColor(stageColors[0]);
    showToast(t('settings.pipelineStageCreated'));
  }

  async function removeStage(stage: PipelineStage) {
    const stageDeals = deals.filter((deal) => deal.stageId === stage.id);
    const fallback = sortedStages.find((item) => item.id !== stage.id);
    if (!fallback) {
      showToast(t('settings.cannotDeleteLastStage'), 'danger');
      return;
    }
    const message = stageDeals.length
      ? t('settings.deleteStageWithDeals', { count: stageDeals.length, stage: fallback.name })
      : t('settings.deleteStageMessage');
    const confirmed = await confirm({
      title: t('settings.deleteStageTitle'),
      message,
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;
    const deleted = deletePipelineStage(stage.id, fallback.id);
    showToast(deleted ? t('settings.pipelineStageDeleted') : t('settings.cannotDeleteLastStage'), deleted ? 'success' : 'danger');
  }

  function createAutomation() {
    if (!automationForm.name.trim() || !automationForm.message.trim()) {
      showToast(t('validation.required'), 'danger');
      return;
    }
    createPipelineAutomation({ ...automationForm, enabled: true });
    setAutomationForm((current) => ({ ...current, name: '', message: '' }));
    showToast(t('pipeline.automationCreated'));
  }

  async function removeAutomation(automation: PipelineAutomation) {
    const confirmed = await confirm({
      title: t('pipeline.deleteAutomationTitle'),
      message: t('pipeline.deleteAutomationMessage'),
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;
    deletePipelineAutomation(automation.id);
    showToast(t('pipeline.automationDeleted'));
  }

  function stageLabel(stageId: string) {
    const stage = pipelineStages.find((item) => item.id === stageId);
    return stage?.isDefault ? t(`stages.${stage.id}`) : stage?.name ?? stageId;
  }

  function automationIcon(type: PipelineAutomationType) {
    if (type === 'robot') return Bot;
    if (type === 'trigger') return Zap;
    return Megaphone;
  }

  return (
    <div>
      <PageHeader
        title={t('pipeline.title')}
        eyebrow={t('pipeline.subtitle')}
        action={
          <div className="flex flex-wrap gap-2">
            {canManagePipeline ? (
              <>
                <Button variant={view === 'stages' ? 'default' : 'outline'} onClick={() => setView(view === 'stages' ? 'board' : 'stages')}>
                  <Workflow className="h-4 w-4" aria-hidden />
                  {t('pipeline.stageSettings')}
                </Button>
                <Button variant={view === 'automation' ? 'default' : 'outline'} onClick={() => setView(view === 'automation' ? 'board' : 'automation')}>
                  <Bot className="h-4 w-4" aria-hidden />
                  {t('pipeline.automation')}
                </Button>
              </>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                setView('board');
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

      {view === 'board' ? (
        <>
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
        </>
      ) : null}

      {view === 'stages' ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.pipelineSettings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_72px_auto]">
              <Input value={newStageName} onChange={(event) => setNewStageName(event.target.value)} placeholder={t('settings.newStage')} />
              <input className="h-10 w-full rounded-md border bg-white p-1" type="color" value={newStageColor} onChange={(event) => setNewStageColor(event.target.value)} />
              <Button onClick={createStage}>
                <Plus className="h-4 w-4" aria-hidden />
                {t('common.create')}
              </Button>
            </div>
            <div className="space-y-2">
              {sortedStages.map((stage) => (
                <div key={stage.id} className="grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-[44px_1fr_72px_auto] sm:items-center">
                  <span className="h-5 w-5 rounded-full" style={{ backgroundColor: stage.color }} />
                  <Input
                    defaultValue={stage.isDefault ? t(`stages.${stage.id}`) : stage.name}
                    onBlur={(event) => updatePipelineStage(stage.id, { name: event.target.value })}
                  />
                  <input className="h-10 w-full rounded-md border bg-white p-1" type="color" value={stage.color} onChange={(event) => updatePipelineStage(stage.id, { color: event.target.value })} />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title={t('settings.moveUp')} onClick={() => reorderPipelineStage(stage.id, 'up')}>
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" title={t('settings.moveDown')} onClick={() => reorderPipelineStage(stage.id, 'down')}>
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" title={t('common.delete')} onClick={() => void removeStage(stage)}>
                      <Trash2 className="h-4 w-4 text-rose-600" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {view === 'automation' ? (
        <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t('pipeline.createAutomation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={automationForm.type}
                onChange={(event) => setAutomationForm({ ...automationForm, type: event.target.value as PipelineAutomationType })}
                className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                {automationTypes.map((type) => (
                  <option key={type} value={type}>
                    {t(`pipeline.automationTypes.${type}`)}
                  </option>
                ))}
              </select>
              <Input value={automationForm.name} onChange={(event) => setAutomationForm({ ...automationForm, name: event.target.value })} placeholder={t('pipeline.automationName')} />
              <select
                value={automationForm.stageId}
                onChange={(event) => setAutomationForm({ ...automationForm, stageId: event.target.value })}
                className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                {sortedStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.isDefault ? t(`stages.${stage.id}`) : stage.name}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-28 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                value={automationForm.message}
                onChange={(event) => setAutomationForm({ ...automationForm, message: event.target.value })}
                placeholder={t('pipeline.automationMessage')}
              />
              <Button className="w-full" onClick={createAutomation}>
                <Plus className="h-4 w-4" aria-hidden />
                {t('common.create')}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {pipelineAutomations.map((automation) => {
              const Icon = automationIcon(automation.type);
              return (
                <Card key={automation.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                          <Icon className="h-4 w-4 text-emerald-700" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <Input
                            className="h-9 max-w-md font-semibold"
                            value={automation.name}
                            onChange={(event) => updatePipelineAutomation(automation.id, { name: event.target.value })}
                          />
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge tone="green">{t(`pipeline.automationTypes.${automation.type}`)}</Badge>
                            <Badge>{stageLabel(automation.stageId)}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className={`h-6 w-10 rounded-full p-0.5 transition ${automation.enabled ? 'bg-emerald-600' : 'bg-neutral-200'}`}
                          aria-label={t('pipeline.automationEnabled')}
                          onClick={() => updatePipelineAutomation(automation.id, { enabled: !automation.enabled })}
                        >
                          <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${automation.enabled ? 'translate-x-4' : ''}`} />
                        </button>
                        <Button variant="ghost" size="icon" title={t('common.delete')} onClick={() => void removeAutomation(automation)}>
                          <Trash2 className="h-4 w-4 text-rose-600" aria-hidden />
                        </Button>
                      </div>
                    </div>
                    <textarea
                      className="min-h-20 w-full rounded-md border bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      value={automation.message}
                      onChange={(event) => updatePipelineAutomation(automation.id, { message: event.target.value })}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

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
