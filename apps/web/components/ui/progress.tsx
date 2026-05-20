import { cn } from '@/lib/utils';

export function Progress({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-md bg-neutral-100', className)}>
      <div
        className={cn('h-full rounded-md bg-emerald-600', barClassName)}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
