import { ReactNode } from 'react';

export function PageHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="mb-1 text-sm text-neutral-500">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold text-neutral-950 md:text-3xl">{title}</h1>
      </div>
      {action}
    </div>
  );
}
