import { cn, initials } from '@/lib/utils';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white',
        className,
      )}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
