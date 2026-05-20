'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-white shadow-soft">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white p-4">
          <h2 className="text-lg font-semibold text-neutral-950">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
