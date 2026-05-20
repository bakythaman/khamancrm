import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCrmData } from '@/hooks/useCrmData';
import { useTranslation } from '@/hooks/useTranslation';
import { formatAmount } from '@/lib/i18n/format';

export function PipelineSnapshot() {
  const { deals, pipelineStages } = useCrmData();
  const { t } = useTranslation();
  const activeValue = deals.filter((deal) => deal.status === 'active').reduce((sum, deal) => sum + deal.amount, 0);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t('dashboard.pipelineHealth')}</CardTitle>
          <p className="mt-1 text-sm text-neutral-500">
            {formatAmount(activeValue)} {t('dashboard.activeValue')}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/pipeline">
            {t('buttons.open')}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {[...pipelineStages].sort((a, b) => a.order - b.order).map((stage) => {
          const count = deals.filter((deal) => deal.stageId === stage.id).length;
          const value = Math.min(100, count * 28 + 12);

          return (
            <div key={stage.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-800">{stage.isDefault ? t(`stages.${stage.id}`) : stage.name}</span>
                <span className="text-neutral-500">
                  {count} {t('analytics.deals')}
                </span>
              </div>
              <Progress value={value} barClassName={stage.id === 'negotiation' ? 'bg-amber-500' : undefined} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
