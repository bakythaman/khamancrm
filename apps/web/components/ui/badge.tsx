import * as React from 'react';
import { cn } from '@/lib/utils';

type BadgeTone = 'neutral' | 'green' | 'blue' | 'amber' | 'rose';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  green: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-800',
  rose: 'bg-rose-50 text-rose-700',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md px-2 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
