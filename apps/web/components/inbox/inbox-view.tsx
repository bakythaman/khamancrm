'use client';

import { Bot, Check, MessageCircle, MoreHorizontal, Phone, Send, Sparkles, Tag, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

export function InboxView() {
  const { deals, teamMembers, pipelineStages, updateDeal } = useCrmData();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  const conversations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return deals.filter(
      (deal) =>
        !normalized ||
        deal.clientName.toLowerCase().includes(normalized) ||
        deal.title.toLowerCase().includes(normalized) ||
        deal.phone.toLowerCase().includes(normalized),
    );
  }, [deals, query]);

  const selected = conversations.find((deal) => deal.id === selectedId) ?? conversations[0];

  if (!selected) {
    return (
      <Card className="p-8 text-center">
        <MessageCircle className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-neutral-950">{t('pipeline.noDeals')}</p>
        <p className="mt-1 text-sm text-neutral-500">{t('inbox.comingSoon')}</p>
      </Card>
    );
  }

  const owner = teamMembers.find((member) => member.id === selected.assignedTo);
  const getStageName = (stageId: string) => {
    const stage = pipelineStages.find((item) => item.id === stageId);
    return stage ? (stage.isDefault ? t(`stages.${stage.id}`) : stage.name) : stageId;
  };

  function comingSoon(type: 'whatsapp' | 'phone') {
    showToast(type === 'whatsapp' ? t('notifications.whatsappSoon') : t('notifications.telephonySoon'), 'info');
  }

  return (
    <div className="grid min-h-[calc(100vh-160px)] gap-4 lg:grid-cols-[320px_minmax(0,1fr)_300px]">
      <Card className="overflow-hidden">
        <div className="border-b p-3">
          <Input
            placeholder={t('inbox.searchPlaceholder')}
            className="h-9 bg-neutral-50"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="thin-scrollbar max-h-[680px] overflow-y-auto">
          {conversations.map((deal) => (
            <button
              key={deal.id}
              className={cn(
                'flex w-full items-start gap-3 border-b p-3 text-left transition hover:bg-neutral-50',
                selected.id === deal.id && 'bg-emerald-50/60',
              )}
              onClick={() => setSelectedId(deal.id)}
            >
              <Avatar name={deal.clientName} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-neutral-950">{deal.clientName}</span>
                  <span className="text-xs text-neutral-400">{getStageName(deal.stageId)}</span>
                </span>
                <span className="mt-1 block truncate text-sm text-neutral-500">{deal.title}</span>
                <span className="mt-2 flex items-center gap-1">
                  <Badge tone="green">{t('buttons.whatsapp')}</Badge>
                  <Badge tone="neutral">{t(`statuses.${deal.status}`)}</Badge>
                </span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex min-h-[620px] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-3">
            <Avatar name={selected.clientName} />
            <div>
              <p className="text-sm font-semibold text-neutral-950">{selected.clientName}</p>
              <p className="text-xs text-neutral-500">{selected.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" title={t('pipeline.assignedTo')} onClick={() => showToast(t('notifications.saved'), 'info')}>
              <UserPlus className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="ghost" size="icon" title={t('buttons.call')} onClick={() => comingSoon('phone')}>
              <Phone className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="ghost" size="icon" title={t('common.status')} onClick={() => showToast(t('notifications.saved'), 'info')}>
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="thin-scrollbar flex-1 space-y-3 overflow-y-auto bg-neutral-50 p-4">
          <div className="mx-auto flex max-w-lg items-start gap-2 rounded-lg border bg-white p-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-emerald-700" aria-hidden />
            <div>
              <p className="text-sm font-medium text-neutral-950">{t('inbox.aiSummary')}</p>
              <p className="mt-1 text-sm text-neutral-500">{t('inbox.aiSummaryText')}</p>
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
              <p>{selected.title}</p>
              <p className="mt-1 text-xs text-neutral-400">{getStageName(selected.stageId)}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white shadow-sm">
              <p>{t('notifications.whatsappSoon')}</p>
              <p className="mt-1 text-xs text-emerald-50">Khaman CRM</p>
            </div>
          </div>
        </div>

        <div className="border-t bg-white p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            {[t('pipeline.createTitle'), t('buttons.sendMessage'), t('tasks.createTitle')].map((template) => (
              <Button key={template} variant="secondary" size="sm" onClick={() => setMessage(template)}>
                {template}
              </Button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              className="min-h-20 flex-1 resize-none rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder={t('inbox.replyPlaceholder')}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <Button size="icon" title={t('buttons.sendMessage')} onClick={() => comingSoon('whatsapp')}>
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-950">{t('inbox.contact')}</p>
            <Badge tone="green">{t('buttons.whatsapp')}</Badge>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="text-neutral-500">{t('common.amount')}</p>
              <p className="font-medium text-neutral-950">{selected.amount.toLocaleString('ru-KZ')} ₸</p>
            </div>
            <div>
              <p className="text-neutral-500">{t('pipeline.assignedTo')}</p>
              <p className="font-medium text-neutral-950">{owner?.name ?? t('common.manager')}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-semibold text-neutral-950">{t('inbox.actions')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateDeal(selected.id, { status: 'active' });
                showToast(t('notifications.saved'));
              }}
            >
              <Tag className="h-4 w-4" aria-hidden />
              {t('common.status')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateDeal(selected.id, { status: 'won' });
                showToast(t('deals.statusChanged'));
              }}
            >
              <Check className="h-4 w-4" aria-hidden />
              {t('statuses.won')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => showToast(t('inbox.aiSummaryText'), 'info')}>
              <Bot className="h-4 w-4" aria-hidden />
              AI
            </Button>
            <Button variant="outline" size="sm" onClick={() => comingSoon('whatsapp')}>
              <MessageCircle className="h-4 w-4" aria-hidden />
              {t('buttons.whatsapp')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
