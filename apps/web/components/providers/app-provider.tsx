'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { CrmDataProvider } from '@/hooks/useCrmData';
import { ToastProvider } from '@/hooks/useToast';
import { TranslationProvider } from '@/hooks/useTranslation';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <TranslationProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <CrmDataProvider>{children}</CrmDataProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </TranslationProvider>
  );
}
