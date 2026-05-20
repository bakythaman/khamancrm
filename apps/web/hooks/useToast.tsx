'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'info' | 'danger';

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => removeToast(id), 2800);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border bg-white p-3 text-sm shadow-soft',
              toast.tone === 'danger' && 'border-rose-200 bg-rose-50 text-rose-900',
              toast.tone === 'info' && 'border-blue-200 bg-blue-50 text-blue-900',
            )}
          >
            {toast.tone === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            ) : (
              <Info className="h-4 w-4 shrink-0" aria-hidden />
            )}
            <span className="min-w-0 flex-1">{toast.message}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeToast(toast.id)} title="Close">
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
