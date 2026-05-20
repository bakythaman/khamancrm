'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

interface ConfirmState extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const close = (confirmed: boolean) => {
    state?.resolve(confirmed);
    setState(null);
  };

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-lg border bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-neutral-950">{state.title}</h2>
            <p className="mt-2 text-sm text-neutral-500">{state.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => close(false)}>
                {state.cancelLabel ?? t('common.cancel')}
              </Button>
              <Button variant={state.tone === 'danger' ? 'danger' : 'default'} onClick={() => close(true)}>
                {state.confirmLabel ?? t('common.yes')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside ConfirmProvider');
  return context;
}
