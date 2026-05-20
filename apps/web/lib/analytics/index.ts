import { isInPeriod, type AnalyticsPeriod } from '@/lib/date-utils';
import type { CrmTask, Deal, PipelineStage, TeamMember } from '@/lib/storage/types';

function inPeriodByUpdatedAt(deal: Deal, period: AnalyticsPeriod) {
  return isInPeriod(deal.updatedAt || deal.createdAt, period);
}

function inPeriodByCreatedAt<T extends { createdAt: string }>(item: T, period: AnalyticsPeriod) {
  return isInPeriod(item.createdAt, period);
}

export function filterDealsByPeriod(deals: Deal[], period: AnalyticsPeriod) {
  return deals.filter((deal) => inPeriodByUpdatedAt(deal, period));
}

export function filterTasksByPeriod(tasks: CrmTask[], period: AnalyticsPeriod) {
  return tasks.filter((task) => inPeriodByCreatedAt(task, period) || isInPeriod(task.dueDate, period));
}

export function calculateRevenue(deals: Deal[], period: AnalyticsPeriod) {
  const periodDeals = filterDealsByPeriod(deals, period);
  const wonDeals = periodDeals.filter((deal) => deal.status === 'won');
  const sourceDeals = wonDeals.length ? wonDeals : periodDeals.filter((deal) => deal.status === 'active');

  return sourceDeals.reduce((sum, deal) => sum + deal.amount, 0);
}

export function calculateDealsCount(deals: Deal[], period: AnalyticsPeriod) {
  return filterDealsByPeriod(deals, period).length;
}

export function calculateConversionRate(deals: Deal[], _stages: PipelineStage[] = [], period: AnalyticsPeriod = 'all') {
  const periodDeals = filterDealsByPeriod(deals, period);
  if (!periodDeals.length) return 0;
  return Math.round((periodDeals.filter((deal) => deal.status === 'won').length / periodDeals.length) * 100);
}

export function calculateTasksStats(tasks: CrmTask[], period: AnalyticsPeriod) {
  const periodTasks = filterTasksByPeriod(tasks, period);
  const completed = periodTasks.filter((task) => task.status === 'done').length;
  const active = periodTasks.filter((task) => task.status === 'active').length;
  const overdue = periodTasks.filter((task) => task.status === 'active' && new Date(task.dueDate).getTime() < Date.now()).length;
  const completionRate = periodTasks.length ? Math.round((completed / periodTasks.length) * 100) : 0;

  return {
    total: periodTasks.length,
    active,
    completed,
    overdue,
    completionRate,
  };
}

export function calculateManagerStats(
  deals: Deal[],
  tasks: CrmTask[],
  team: TeamMember[],
  period: AnalyticsPeriod,
) {
  const periodDeals = filterDealsByPeriod(deals, period);
  const periodTasks = filterTasksByPeriod(tasks, period);

  return team.map((member) => {
    const managerDeals = periodDeals.filter((deal) => deal.assignedTo === member.id);
    const managerTasks = periodTasks.filter((task) => task.assignedTo === member.id);
    const wonDeals = managerDeals.filter((deal) => deal.status === 'won');
    const completedTasks = managerTasks.filter((task) => task.status === 'done');
    const overdueTasks = managerTasks.filter(
      (task) => task.status === 'active' && new Date(task.dueDate).getTime() < Date.now(),
    );
    const revenueDeals = wonDeals.length ? wonDeals : managerDeals.filter((deal) => deal.status === 'active');

    return {
      member,
      deals: managerDeals,
      tasks: managerTasks,
      revenue: revenueDeals.reduce((sum, deal) => sum + deal.amount, 0),
      dealsCount: managerDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: managerDeals.filter((deal) => deal.status === 'lost').length,
      tasksCount: managerTasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      conversion: managerDeals.length ? Math.round((wonDeals.length / managerDeals.length) * 100) : 0,
      averageResponseTime: '11m',
    };
  });
}

export function calculateAnalytics(deals: Deal[], tasks: CrmTask[], team: TeamMember[], stages: PipelineStage[], period: AnalyticsPeriod) {
  const periodDeals = filterDealsByPeriod(deals, period);
  const wonDeals = periodDeals.filter((deal) => deal.status === 'won');
  const lostDeals = periodDeals.filter((deal) => deal.status === 'lost');
  const revenue = calculateRevenue(deals, period);

  return {
    revenue,
    revenueSource: wonDeals.length ? 'won' : 'active',
    dealsCount: periodDeals.length,
    wonDeals: wonDeals.length,
    lostDeals: lostDeals.length,
    conversion: calculateConversionRate(deals, stages, period),
    averageDeal: wonDeals.length ? Math.round(revenue / wonDeals.length) : 0,
    tasks: calculateTasksStats(tasks, period),
    managers: calculateManagerStats(deals, tasks, team, period),
  };
}

function csvCell(value: string | number) {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildAnalyticsCsv({
  deals,
  tasks,
  team,
  stages,
  period,
}: {
  deals: Deal[];
  tasks: CrmTask[];
  team: TeamMember[];
  stages: PipelineStage[];
  period: AnalyticsPeriod;
}) {
  const analytics = calculateAnalytics(deals, tasks, team, stages, period);
  const lines = [
    ['metric', 'value'],
    ['period', period],
    ['revenue', analytics.revenue],
    ['deals', analytics.dealsCount],
    ['won_deals', analytics.wonDeals],
    ['lost_deals', analytics.lostDeals],
    ['conversion', `${analytics.conversion}%`],
    ['average_deal', analytics.averageDeal],
    ['active_tasks', analytics.tasks.active],
    ['completed_tasks', analytics.tasks.completed],
    ['overdue_tasks', analytics.tasks.overdue],
    [],
    ['deal_id', 'title', 'client', 'phone', 'amount', 'status', 'stage', 'assigned_to', 'created_at', 'updated_at'],
  ];

  const periodDeals = filterDealsByPeriod(deals, period);
  const dealLines = periodDeals.map((deal) => {
    const stage = stages.find((item) => item.id === deal.stageId);
    const manager = team.find((member) => member.id === deal.assignedTo);
    return [
      deal.id,
      deal.title,
      deal.clientName,
      deal.phone,
      deal.amount,
      deal.status,
      stage?.name ?? deal.stageId,
      manager?.name ?? '',
      deal.createdAt,
      deal.updatedAt,
    ];
  });

  return [...lines, ...dealLines].map((row) => row.map(csvCell).join(',')).join('\n');
}
