'use client';

import { Plus } from 'lucide-react';
import { InboxView } from '@/components/inbox/inbox-view';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';

export default function InboxPage() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  return (
    <div>
      <PageHeader
        title={t('inbox.title')}
        eyebrow={t('inbox.subtitle')}
        action={
          <Button onClick={() => showToast(t('notifications.whatsappSoon'), 'info')}>
            <Plus className="h-4 w-4" aria-hidden />
            {t('buttons.connectWhatsapp')}
          </Button>
        }
      />
      <InboxView />
    </div>
  );
}
