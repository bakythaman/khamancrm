'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Bell,
  CheckSquare,
  Inbox,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  Phone,
  Search,
  Settings,
  Users,
  Workflow,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { hasPermission } from '@/lib/permissions';
import type { Permission } from '@/lib/storage/types';
import { cn } from '@/lib/utils';

const navItems = [
  { labelKey: 'navigation.dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
  { labelKey: 'navigation.pipeline', href: '/pipeline', icon: Workflow, permission: 'view_pipeline' },
  { labelKey: 'navigation.inbox', href: '/inbox', icon: Inbox, permission: 'view_pipeline' },
  { labelKey: 'navigation.tasks', href: '/tasks', icon: CheckSquare, permission: 'view_tasks' },
  { labelKey: 'navigation.analytics', href: '/analytics', icon: BarChart3, permission: 'view_analytics' },
  { labelKey: 'navigation.team', href: '/team', icon: Users, permission: 'view_team' },
  { labelKey: 'navigation.settings', href: '/settings', icon: Settings, permission: 'view_settings' },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { currentUser, company } = useAuth();
  const { roles, settings } = useCrmData();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const visibleNavItems = navItems.filter((item) => hasPermission(currentUser, roles, item.permission as Permission));

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    router.push(`/pipeline?search=${encodeURIComponent(value)}`);
    showToast(t('notifications.filtersApplied'), 'info');
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-neutral-950 text-sm font-bold text-white">
              {settings.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logoDataUrl} alt="Khaman CRM" className="h-full w-full object-contain bg-white" />
              ) : (
                'K'
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold">Khaman CRM</span>
              <span className="block text-xs text-neutral-500">{company?.name ?? t('navigation.workspace')}</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(false)}
            title="Close menu"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-3">
          {visibleNavItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950',
                  active && 'bg-neutral-950 text-white hover:bg-neutral-950 hover:text-white',
                )}
                >
                <Icon className="h-4 w-4" aria-hidden />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="rounded-lg bg-emerald-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <Phone className="h-4 w-4" aria-hidden />
              {t('notifications.telephonySoon')}
            </div>
            <p className="mt-1 text-xs text-emerald-800">{t('buttons.callHistory')}</p>
          </div>
        </div>
      </aside>

      {open ? (
        <button
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} title="Open menu">
            <Menu className="h-4 w-4" aria-hidden />
          </Button>
          <form className="relative max-w-xl flex-1" onSubmit={handleSearch}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <Input
              className="h-9 bg-neutral-50 pl-9"
              placeholder={t('common.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </form>
          <Button
            variant="ghost"
            size="icon"
            title={t('settings.notifications')}
            onClick={() => showToast(settings.notificationsEnabled ? t('notifications.noNotifications') : t('notifications.disabled'), 'info')}
          >
            <Bell className="h-4 w-4" aria-hidden />
          </Button>
          <Link
            href={hasPermission(currentUser, roles, 'view_team') ? '/team' : '/settings'}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white"
            title={hasPermission(currentUser, roles, 'view_team') ? t('navigation.team') : t('settings.profile')}
          >
            {currentUser?.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() ?? 'K'}
          </Link>
        </header>
        <main className="mx-auto w-full max-w-[1440px] p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
