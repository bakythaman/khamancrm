'use client';

import { Activity, BarChart3, Building2, Circle, Database, ShieldCheck, Users, Workflow } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/useAuth';
import { useCrmData } from '@/hooks/useCrmData';
import { useTranslation } from '@/hooks/useTranslation';
import { formatAmount, formatDateTime } from '@/lib/i18n/format';
import { hasPermission } from '@/lib/permissions';
import { storageKeys } from '@/lib/storage/keys';
import { readJson } from '@/lib/storage/local-store';
import type { Company, CompanyData, CrmTask, Deal, TeamMember, User } from '@/lib/storage/types';
import { cn } from '@/lib/utils';

interface CompanySnapshot {
  company: Company;
  users: User[];
  data: CompanyData | null;
}

interface AdminSnapshot {
  companies: CompanySnapshot[];
  users: User[];
}

function isOnline(member: TeamMember) {
  if (!member.isOnline) return false;
  if (!member.lastSeenAt) return true;
  return Date.now() - new Date(member.lastSeenAt).getTime() < 5 * 60 * 1000;
}

function revenueForDeals(deals: Deal[]) {
  const wonDeals = deals.filter((deal) => deal.status === 'won');
  const sourceDeals = wonDeals.length ? wonDeals : deals.filter((deal) => deal.status === 'active');
  return sourceDeals.reduce((sum, deal) => sum + deal.amount, 0);
}

function latestDate(...values: Array<string | undefined>) {
  const timestamps = values
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter(Number.isFinite);
  if (!timestamps.length) return undefined;
  return new Date(Math.max(...timestamps)).toISOString();
}

function displayDate(value?: string) {
  return value ? formatDateTime(value) : '-';
}

function loadSnapshot(): AdminSnapshot {
  const users = readJson<User[]>(storageKeys.users, []);
  const companies = readJson<Company[]>(storageKeys.companies, []);

  return {
    users,
    companies: companies.map((company) => ({
      company,
      users: users.filter((user) => user.companyId === company.id),
      data: readJson<CompanyData | null>(storageKeys.companyData(company.id), null),
    })),
  };
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-950">{value}</p>
            {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Icon className="h-5 w-5 text-neutral-700" aria-hidden />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { currentUser } = useAuth();
  const { roles } = useCrmData();
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<AdminSnapshot>({ companies: [], users: [] });
  const canViewAdmin = hasPermission(currentUser, roles, 'view_admin');

  useEffect(() => {
    setSnapshot(loadSnapshot());
  }, []);

  const companyRows = useMemo(
    () =>
      snapshot.companies.map(({ company, users, data }) => {
        const deals = data?.deals ?? [];
        const tasks = data?.tasks ?? [];
        const members = data?.teamMembers ?? [];
        return {
          company,
          users: users.length || members.length,
          deals,
          tasks,
          revenue: revenueForDeals(deals),
          online: members.filter(isOnline).length,
          offline: members.filter((member) => !isOnline(member)).length,
        };
      }),
    [snapshot.companies],
  );

  const managerRows = useMemo(
    () =>
      snapshot.companies.flatMap(({ company, data }) =>
        (data?.teamMembers ?? []).map((member) => {
          const memberDeals = (data?.deals ?? []).filter((deal) => deal.assignedTo === member.id);
          const memberTasks = (data?.tasks ?? []).filter((task) => task.assignedTo === member.id);
          const completedTasks = memberTasks.filter((task) => task.status === 'done');
          const overdueTasks = memberTasks.filter((task) => task.status === 'active' && new Date(task.dueDate).getTime() < Date.now());
          const wonDeals = memberDeals.filter((deal) => deal.status === 'won');
          return {
            company,
            member,
            online: isOnline(member),
            processedLeads: memberDeals.length,
            revenue: revenueForDeals(memberDeals),
            tasks: memberTasks,
            completedTasks,
            overdueTasks,
            conversion: memberDeals.length ? Math.round((wonDeals.length / memberDeals.length) * 100) : 0,
            lastActivity: latestDate(member.lastSeenAt, member.lastLoginAt, member.lastLogoutAt),
          };
        }),
      ),
    [snapshot.companies],
  );

  const totals = useMemo(() => {
    const deals = companyRows.flatMap((row) => row.deals);
    const tasks = companyRows.flatMap((row) => row.tasks);
    const online = managerRows.filter((row) => row.online).length;
    return {
      companies: companyRows.length,
      users: snapshot.users.length || managerRows.length,
      deals: deals.length,
      tasks: tasks.length,
      revenue: revenueForDeals(deals),
      online,
      offline: Math.max(managerRows.length - online, 0),
    };
  }, [companyRows, managerRows, snapshot.users.length]);

  if (!canViewAdmin) {
    return <EmptyState icon={ShieldCheck} title={t('navigation.admin')} description={t('settings.criticalHidden')} />;
  }

  return (
    <div>
      <PageHeader title={t('admin.title')} eyebrow={t('admin.subtitle')} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Building2} label={t('admin.totalCompanies')} value={totals.companies} />
        <MetricCard icon={Users} label={t('admin.totalUsers')} value={totals.users} />
        <MetricCard icon={Workflow} label={t('admin.totalDeals')} value={totals.deals} hint={`${totals.tasks} ${t('admin.tasks').toLowerCase()}`} />
        <MetricCard icon={BarChart3} label={t('admin.totalRevenue')} value={formatAmount(totals.revenue)} />
        <MetricCard icon={Activity} label={t('admin.onlineNow')} value={totals.online} hint={`${totals.offline} ${t('admin.offlineNow').toLowerCase()}`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.developerPanel')}</CardTitle>
            <Database className="h-4 w-4 text-neutral-500" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-sm text-neutral-500">{t('admin.storageMode')}</p>
              <p className="mt-1 text-sm font-semibold text-neutral-950">
                {process.env.NEXT_PUBLIC_API_URL ? t('admin.apiMode') : t('admin.localStorageMode')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-neutral-50 p-3">
                <p className="text-xs text-neutral-500">{t('admin.logins')}</p>
                <p className="text-lg font-semibold text-neutral-950">
                  {managerRows.reduce((sum, row) => sum + (row.member.loginCount ?? 0), 0)}
                </p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3">
                <p className="text-xs text-neutral-500">{t('admin.logouts')}</p>
                <p className="text-lg font-semibold text-neutral-950">
                  {managerRows.reduce((sum, row) => sum + (row.member.logoutCount ?? 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{t('admin.companyAnalytics')}</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-[minmax(180px,1.2fr)_repeat(5,minmax(88px,0.5fr))] gap-3 border-b bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-500 max-lg:hidden">
            <span>{t('common.company')}</span>
            <span>{t('admin.users')}</span>
            <span>{t('admin.deals')}</span>
            <span>{t('admin.revenue')}</span>
            <span>{t('admin.onlineNow')}</span>
            <span>{t('admin.status')}</span>
          </div>
          <div className="divide-y">
            {companyRows.length ? (
              companyRows.map((row) => (
                <div key={row.company.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(180px,1.2fr)_repeat(5,minmax(88px,0.5fr))] lg:items-center">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{row.company.name}</p>
                    <p className="text-xs text-neutral-500">{displayDate(row.company.createdAt)}</p>
                  </div>
                  <p className="text-sm font-medium text-neutral-950">{row.users}</p>
                  <p className="text-sm font-medium text-neutral-950">{row.deals.length}</p>
                  <p className="text-sm font-medium text-neutral-950">{formatAmount(row.revenue)}</p>
                  <p className="text-sm font-medium text-neutral-950">{row.online}</p>
                  <Badge tone={row.online ? 'green' : 'neutral'}>{row.online ? t('team.online') : t('team.offline')}</Badge>
                </div>
              ))
            ) : (
              <EmptyState icon={Building2} title={t('admin.registeredCompanies')} description={t('admin.noCompanies')} />
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        <CardHeader>
          <CardTitle>{t('admin.managerAnalytics')}</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-[minmax(220px,1.2fr)_minmax(140px,0.8fr)_repeat(5,minmax(92px,0.5fr))] gap-3 border-b bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-500 max-xl:hidden">
          <span>{t('common.manager')}</span>
          <span>{t('common.company')}</span>
          <span>{t('admin.status')}</span>
          <span>{t('admin.processedLeads')}</span>
          <span>{t('analytics.conversion')}</span>
          <span>{t('admin.tasks')}</span>
          <span>{t('admin.lastActivity')}</span>
        </div>
        <div className="divide-y">
          {managerRows.length ? (
            managerRows.map((row) => (
              <div key={`${row.company.id}-${row.member.id}`} className="grid gap-3 p-4 xl:grid-cols-[minmax(220px,1.2fr)_minmax(140px,0.8fr)_repeat(5,minmax(92px,0.5fr))] xl:items-center">
                <div>
                  <p className="text-sm font-semibold text-neutral-950">{row.member.name}</p>
                  <p className="text-xs text-neutral-500">{row.member.email}</p>
                </div>
                <p className="text-sm text-neutral-700">{row.company.name}</p>
                <Badge tone={row.online ? 'green' : 'neutral'} className="gap-1.5">
                  <Circle className={cn('h-2 w-2 fill-current', row.online ? 'text-emerald-600' : 'text-neutral-400')} aria-hidden />
                  {row.online ? t('team.online') : t('team.offline')}
                </Badge>
                <p className="text-sm font-medium text-neutral-950">{row.processedLeads}</p>
                <p className="text-sm font-medium text-neutral-950">{row.conversion}%</p>
                <p className="text-sm text-neutral-700">
                  {row.completedTasks.length}/{row.tasks.length}
                  {row.overdueTasks.length ? <span className="text-rose-600"> - {row.overdueTasks.length} {t('common.overdue').toLowerCase()}</span> : null}
                </p>
                <div>
                  <p className="text-sm font-medium text-neutral-950">{displayDate(row.lastActivity)}</p>
                  <p className="text-xs text-neutral-500">{t('admin.logins')}: {row.member.loginCount ?? 0} / {t('admin.logouts')}: {row.member.logoutCount ?? 0}</p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState icon={Users} title={t('admin.managerAnalytics')} description={t('team.noMessages')} />
          )}
        </div>
      </Card>
    </div>
  );
}
