import { createDefaultRoles } from '@/lib/permissions';
import type { CompanyData, Deal, PipelineAutomation, PipelineStage, TeamGroup, TeamMember, User } from '@/lib/storage/types';

const now = () => new Date().toISOString();

export const pipelineStages = ['new', 'contacted', 'negotiation', 'won', 'lost'] as const;

export const defaultTeamGroupIds = {
  all: 'all-team',
  managers: 'managers',
  leaders: 'leaders',
} as const;

export function createDefaultPipelineStages(createdAt = now()): PipelineStage[] {
  return [
    { id: 'new', name: 'Новые', color: '#64748b', order: 0, isDefault: true, createdAt },
    { id: 'contacted', name: 'Связались', color: '#2563eb', order: 1, isDefault: true, createdAt },
    { id: 'negotiation', name: 'Переговоры', color: '#d97706', order: 2, isDefault: true, createdAt },
    { id: 'won', name: 'Выиграно', color: '#059669', order: 3, isDefault: true, createdAt },
    { id: 'lost', name: 'Потеряно', color: '#e11d48', order: 4, isDefault: true, createdAt },
  ];
}

export function createDefaultSettings() {
  return {
    notificationsEnabled: false,
    notificationPermission: undefined,
    logoDataUrl: undefined,
    automation: [true, true, false],
  };
}

export function createDefaultPipelineAutomations(createdAt = now()): PipelineAutomation[] {
  return [
    {
      id: crypto.randomUUID(),
      type: 'robot',
      name: 'Задача после нового лида',
      stageId: 'new',
      message: 'Создать задачу ответственному менеджеру через 15 минут после появления нового лида.',
      enabled: true,
      createdAt,
    },
    {
      id: crypto.randomUUID(),
      type: 'trigger',
      name: 'Триггер при выигрыше сделки',
      stageId: 'won',
      message: 'Показать уведомление руководителю, когда сделка перешла в выигранные.',
      enabled: true,
      createdAt,
    },
    {
      id: crypto.randomUUID(),
      type: 'broadcast',
      name: 'Рассылка по потерянным лидам',
      stageId: 'lost',
      message: 'Подготовить мягкое сообщение для повторного контакта через 7 дней.',
      enabled: false,
      createdAt,
    },
  ];
}

export function createDefaultTeamGroups(createdBy: string, members: TeamMember[], createdAt = now()): TeamGroup[] {
  const allMemberIds = members.map((member) => member.id);
  const managerIds = members.filter((member) => member.role === 'manager').map((member) => member.id);
  const leaderIds = members.filter((member) => member.role === 'owner' || member.role === 'admin').map((member) => member.id);

  return [
    {
      id: defaultTeamGroupIds.all,
      name: 'Вся команда',
      memberIds: allMemberIds,
      createdBy,
      createdAt,
      isDefault: true,
    },
    {
      id: defaultTeamGroupIds.managers,
      name: 'Менеджеры',
      memberIds: managerIds.length ? managerIds : allMemberIds,
      createdBy,
      createdAt,
      isDefault: true,
    },
    {
      id: defaultTeamGroupIds.leaders,
      name: 'Руководители',
      memberIds: leaderIds.length ? leaderIds : [createdBy],
      createdBy,
      createdAt,
      isDefault: true,
    },
  ];
}

export function createEmptyCompanyData(owner: User): CompanyData {
  const ownerMember: TeamMember = {
    id: owner.id,
    name: owner.name,
    email: owner.email,
    phone: owner.phone,
    role: owner.role,
    status: 'active',
    avatarDataUrl: owner.avatarDataUrl,
  };

  return {
    deals: [],
    tasks: [],
    teamMembers: [ownerMember],
    teamGroups: createDefaultTeamGroups(owner.id, [ownerMember]),
    pipelineStages: createDefaultPipelineStages(),
    pipelineAutomations: createDefaultPipelineAutomations(),
    teamMessages: [],
    roles: createDefaultRoles(),
    settings: createDefaultSettings(),
  };
}

export function createDemoCompanyData(owner: User): CompanyData {
  const manager: TeamMember = {
    id: crypto.randomUUID(),
    name: 'Айгерим Садыкова',
    email: 'aigerim@demo.kz',
    phone: '+7 701 000 22 11',
    role: 'manager',
    status: 'active',
  };

  const firstDeal: Deal = {
    id: crypto.randomUUID(),
    title: 'Ремонт кухни',
    clientName: 'Надия Петрова',
    phone: '+7 701 555 10 20',
    amount: 560000,
    stageId: 'new',
    stage: 'new',
    status: 'active',
    assignedTo: owner.id,
    createdAt: now(),
    updatedAt: now(),
    comments: [],
    taskIds: [],
  };

  const secondDeal: Deal = {
    id: crypto.randomUUID(),
    title: 'Мебель для офиса',
    clientName: 'Тимур Алимов',
    phone: '+7 707 333 90 12',
    amount: 930000,
    stageId: 'contacted',
    stage: 'contacted',
    status: 'active',
    assignedTo: manager.id,
    createdAt: now(),
    updatedAt: now(),
    comments: [],
    taskIds: [],
  };

  const taskId = crypto.randomUUID();
  firstDeal.taskIds = [taskId];

  const teamMembers: TeamMember[] = [
    {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      role: owner.role,
      status: 'active',
      avatarDataUrl: owner.avatarDataUrl,
    },
    manager,
  ];

  return {
    deals: [firstDeal, secondDeal],
    tasks: [
      {
        id: taskId,
        title: 'Отправить каталог',
        description: 'Коротко отправить варианты и цены.',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
        status: 'active',
        assignedTo: owner.id,
        dealId: firstDeal.id,
        createdAt: now(),
      },
    ],
    teamMembers,
    teamGroups: createDefaultTeamGroups(owner.id, teamMembers),
    pipelineStages: createDefaultPipelineStages(),
    pipelineAutomations: createDefaultPipelineAutomations(),
    teamMessages: [],
    roles: createDefaultRoles(),
    settings: createDefaultSettings(),
  };
}
