import { Send } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';

export function HotConversations() {
  const { deals, pipelineStages } = useCrmData();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const hotDeals = deals.filter((deal) => deal.status === 'active').slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t('dashboard.hotChats')}</CardTitle>
          <p className="mt-1 text-sm text-neutral-500">{t('inbox.comingSoon')}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/inbox">{t('navigation.inbox')}</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {hotDeals.length ? (
          hotDeals.map((deal) => (
            <div key={deal.id} className="flex items-center gap-3 rounded-lg border bg-white p-3">
              <Avatar name={deal.clientName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-neutral-950">{deal.clientName}</p>
                  <Badge tone="green">
                    {(() => {
                      const stage = pipelineStages.find((item) => item.id === deal.stageId);
                      return stage ? (stage.isDefault ? t(`stages.${stage.id}`) : stage.name) : deal.stageId;
                    })()}
                  </Badge>
                </div>
                <p className="truncate text-sm text-neutral-500">{deal.title}</p>
              </div>
              <Button variant="ghost" size="icon" title={t('buttons.sendMessage')} onClick={() => showToast(t('notifications.whatsappSoon'), 'info')}>
                <Send className="h-4 w-4 text-emerald-700" aria-hidden />
              </Button>
            </div>
          ))
        ) : (
          <div className="rounded-lg border bg-neutral-50 p-5 text-sm text-neutral-500">{t('pipeline.noDeals')}</div>
        )}
      </CardContent>
    </Card>
  );
}
