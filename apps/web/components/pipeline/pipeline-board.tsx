'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Edit3, GripVertical, MessageCircle, Phone, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DealFormModal } from '@/components/forms/deal-form-modal';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { hasPermission } from '@/lib/permissions';
import type { Deal, DealStatus } from '@/lib/storage/types';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/i18n/format';

export interface PipelineFilters {
  query: string;
  stageId: string;
  assignedTo: string;
  status: DealStatus | 'all';
  minAmount: string;
}

function stageName(stage: { id: string; name: string; isDefault: boolean }, t: (key: string) => string) {
  return stage.isDefault ? t(`stages.${stage.id}`) : stage.name;
}

export function PipelineBoard({ filters }: { filters: PipelineFilters }) {
  const { currentUser } = useAuth();
  const { deals, teamMembers, pipelineStages, roles, moveDeal, updateDeal, deleteDeal } = useCrmData();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>();
  const canEditDeals = hasPermission(currentUser, roles, 'edit_deal');
  const canDeleteDeals = hasPermission(currentUser, roles, 'delete_deal');

  const sortedStages = useMemo(() => [...pipelineStages].sort((a, b) => a.order - b.order), [pipelineStages]);

  const filteredDeals = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase();
    const minAmount = Number(filters.minAmount);
    return deals.filter((deal) => {
      const owner = teamMembers.find((member) => member.id === deal.assignedTo);
      const stage = sortedStages.find((item) => item.id === deal.stageId);
      const searchable = [
        deal.title,
        deal.clientName,
        deal.phone,
        owner?.name,
        owner?.email,
        deal.status,
        stage?.name,
        stage?.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesStage = filters.stageId === 'all' || deal.stageId === filters.stageId;
      const matchesOwner = filters.assignedTo === 'all' || deal.assignedTo === filters.assignedTo;
      const matchesStatus = filters.status === 'all' || deal.status === filters.status;
      const matchesAmount = !filters.minAmount || (Number.isFinite(minAmount) && deal.amount >= minAmount);
      return matchesQuery && matchesStage && matchesOwner && matchesStatus && matchesAmount;
    });
  }, [deals, filters, sortedStages, teamMembers]);

  const totals = useMemo(
    () =>
      sortedStages.map((stage) => {
        const stageDeals = filteredDeals.filter((deal) => deal.stageId === stage.id);
        return {
          ...stage,
          deals: stageDeals,
          value: stageDeals.reduce((sum, deal) => sum + deal.amount, 0),
        };
      }),
    [filteredDeals, sortedStages],
  );

  function moveToStage(stageId: string) {
    if (!draggingId) return;
    if (!canEditDeals) return;
    moveDeal(draggingId, stageId);
    showToast(t('pipeline.stageChanged'));
    setDraggingId(null);
  }

  async function handleDelete(deal: Deal) {
    const confirmed = await confirm({
      title: t('pipeline.deleteTitle'),
      message: t('pipeline.deleteMessage'),
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;
    deleteDeal(deal.id);
    showToast(t('pipeline.dealDeleted'));
  }

  if (!filteredDeals.length && deals.length) {
    return <EmptyState icon={GripVertical} title={t('common.notFound')} description={t('common.noSearchResults')} />;
  }

  return (
    <>
      <div className="thin-scrollbar -mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        <div className="flex min-w-max gap-3">
          {totals.map((stage) => (
            <section
              key={stage.id}
              className="flex min-h-[620px] w-[296px] flex-col rounded-lg border bg-neutral-100/70"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => moveToStage(stage.id)}
            >
              <div className="flex items-start justify-between gap-2 border-b bg-white/80 p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className="max-w-[190px] truncate"
                      style={{ backgroundColor: `${stage.color}18`, color: stage.color }}
                    >
                      {stageName(stage, t)}
                    </Badge>
                    <span className="text-xs text-neutral-500">{stage.deals.length}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-neutral-950">{formatAmount(stage.value)}</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-3">
                {stage.deals.length ? (
                  stage.deals.map((deal) => {
                    const owner = teamMembers.find((member) => member.id === deal.assignedTo);

                    return (
                      <motion.div
                        key={deal.id}
                        layout
                        draggable={canEditDeals}
                        onDragStart={() => setDraggingId(deal.id)}
                        onDragEnd={() => setDraggingId(null)}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.18 }}
                      >
                        <Card
                          className={cn(
                            'group cursor-grab overflow-hidden p-3 transition hover:border-neutral-300 hover:shadow-soft active:cursor-grabbing',
                            draggingId === deal.id && 'opacity-60',
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="mt-1 h-4 w-4 shrink-0 text-neutral-300" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/deals/${deal.id}`}
                                className="line-clamp-2 text-sm font-semibold text-neutral-950 hover:text-emerald-700"
                              >
                                {deal.title}
                              </Link>
                              <p className="mt-1 truncate text-sm text-neutral-500">{deal.clientName}</p>
                              <p className="mt-1 truncate text-xs text-neutral-400">{deal.phone}</p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="min-w-0 truncate text-lg font-semibold text-neutral-950">{formatAmount(deal.amount)}</p>
                            <Avatar name={owner?.name ?? deal.clientName} className="h-7 w-7 shrink-0 text-[11px]" />
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <Badge tone={deal.status === 'lost' ? 'rose' : deal.status === 'won' ? 'green' : 'neutral'}>
                              {t(`statuses.${deal.status}`)}
                            </Badge>
                            <div className="flex shrink-0 items-center gap-1 overflow-hidden rounded-md bg-white/70">
                              {canEditDeals ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title={t('buttons.edit')}
                                  onClick={() => setEditingDeal(deal)}
                                >
                                  <Edit3 className="h-4 w-4" aria-hidden />
                                </Button>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={t('buttons.whatsapp')}
                                onClick={() => showToast(t('notifications.whatsappSoon'), 'info')}
                              >
                                <MessageCircle className="h-4 w-4 text-emerald-700" aria-hidden />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={t('buttons.call')}
                                onClick={() => showToast(t('notifications.telephonySoon'), 'info')}
                              >
                                <Phone className="h-4 w-4" aria-hidden />
                              </Button>
                              {canDeleteDeals ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  title={t('common.delete')}
                                  onClick={() => void handleDelete(deal)}
                                >
                                  <Trash2 className="h-4 w-4 text-rose-600" aria-hidden />
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed bg-white/70 p-4 text-center text-sm text-neutral-500">
                    {t('pipeline.noDeals')}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      <DealFormModal
        open={Boolean(editingDeal)}
        deal={editingDeal}
        onClose={() => setEditingDeal(undefined)}
        onSubmit={(payload) => {
          if (!editingDeal) return;
          updateDeal(editingDeal.id, payload);
          setEditingDeal(undefined);
          showToast(t('pipeline.dealUpdated'));
        }}
      />
    </>
  );
}
