'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'green' | 'blue' | 'amber';
}) {
  const toneClass = {
    neutral: 'bg-neutral-100 text-neutral-800',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">{title}</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
          </div>
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', toneClass)}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <p className="mt-3 text-sm text-neutral-500">{change}</p>
      </Card>
    </motion.div>
  );
}
