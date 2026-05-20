import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border bg-white p-8 text-center', className)}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
        <Icon className="h-5 w-5 text-neutral-700" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>
    </div>
  );
}
