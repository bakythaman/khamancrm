import { createDefaultRoles } from '@/lib/permissions';
import type { CompanyData, Deal, PipelineStage, TeamMember, User } from '@/lib/storage/types';

const now = () => new Date().toISOString();

export const pipelineStages = ['new', 'contacted', 'negotiation', 'won', 'lost'] as const;

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

export function createEmptyCompanyData(owner: User): CompanyData {
  const ownerMember: TeamMember = {
    id: owner.id,
    name: owner.name,
    email: owner.email,
    phone: owner.phone,
    role: owner.role,
    status: 'active',
  };

  return {
    deals: [],
    tasks: [],
    teamMembers: [ownerMember],
    pipelineStages: createDefaultPipelineStages(),
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
    teamMembers: [
      {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        role: owner.role,
        status: 'active',
      },
      manager,
    ],
    pipelineStages: createDefaultPipelineStages(),
    roles: createDefaultRoles(),
    settings: createDefaultSettings(),
  };
}
