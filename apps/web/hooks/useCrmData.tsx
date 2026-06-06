'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createDefaultPipelineAutomations,
  createDefaultPipelineStages,
  createDefaultSettings,
  createDefaultTeamGroups,
  createEmptyCompanyData,
  createEmptyRepairData,
  defaultTeamGroupIds,
} from '@/lib/mock-data/seed';
import { createDefaultRoles, isDefaultRole } from '@/lib/permissions';
import { storageKeys } from '@/lib/storage/keys';
import { readJson, writeJson } from '@/lib/storage/local-store';
import type {
  CompanyData,
  CompanyVertical,
  CompanySettings,
  CrmTask,
  Deal,
  DealComment,
  DealPayload,
  DealStage,
  Permission,
  PipelineAutomation,
  PipelineAutomationType,
  PipelineStage,
  RepairData,
  RoleDefinition,
  TaskPayload,
  TeamGroup,
  TeamMessage,
  TeamMember,
  TeamMemberPayload,
  User,
  DealStatus,
} from '@/lib/storage/types';
import { useAuth } from '@/hooks/useAuth';

interface CrmDataContextValue extends CompanyData {
  loading: boolean;
  createDeal: (payload: DealPayload) => Deal;
  updateDeal: (id: string, payload: Partial<DealPayload>) => void;
  moveDeal: (id: string, stageId: string) => void;
  deleteDeal: (id: string) => void;
  addComment: (dealId: string, text: string) => void;
  createTask: (payload: TaskPayload) => CrmTask;
  updateTask: (id: string, payload: Partial<TaskPayload>) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  createTeamMember: (payload: TeamMemberPayload) => Promise<TeamMember>;
  updateTeamMember: (id: string, payload: Partial<TeamMemberPayload>) => void;
  toggleTeamMemberStatus: (id: string) => void;
  deleteTeamMember: (id: string) => void;
  createPipelineStage: (name: string, color: string) => PipelineStage;
  updatePipelineStage: (id: string, payload: Partial<Pick<PipelineStage, 'name' | 'color'>>) => void;
  reorderPipelineStage: (id: string, direction: 'up' | 'down') => void;
  deletePipelineStage: (id: string, transferStageId?: string) => boolean;
  createPipelineAutomation: (payload: Omit<PipelineAutomation, 'id' | 'createdAt'>) => PipelineAutomation;
  updatePipelineAutomation: (id: string, payload: Partial<Pick<PipelineAutomation, 'type' | 'name' | 'stageId' | 'message' | 'enabled'>>) => void;
  deletePipelineAutomation: (id: string) => void;
  createTeamGroup: (name: string, memberIds: string[]) => TeamGroup | null;
  addTeamMessage: (groupId: string, text: string, taskId?: string) => TeamMessage | null;
  updateCompanySettings: (payload: Partial<CompanySettings>) => void;
  createRole: (name: string, permissions: Permission[]) => RoleDefinition;
  updateRole: (id: string, payload: Partial<Pick<RoleDefinition, 'name' | 'permissions'>>) => void;
  deleteRole: (id: string) => boolean;
  updateRepairData: (updater: (repair: RepairData) => RepairData) => void;
}

const emptyData: CompanyData = {
  deals: [],
  tasks: [],
  teamMembers: [],
  teamGroups: [],
  pipelineStages: createDefaultPipelineStages(),
  pipelineAutomations: [],
  teamMessages: [],
  roles: createDefaultRoles(),
  settings: createDefaultSettings(),
};

const CrmDataContext = createContext<CrmDataContextValue | null>(null);

function statusForStage(stageId: string): DealStatus {
  if (stageId === 'won') return 'won';
  if (stageId === 'lost') return 'lost';
  return 'active';
}

function normalizeStageId(stageId: string | undefined, stages: PipelineStage[]) {
  if (stageId && stages.some((stage) => stage.id === stageId)) return stageId;
  return stages[0]?.id ?? 'new';
}

function normalizeLegacyStatus(status: unknown, stageId: string): DealStatus {
  if (status === 'won' || status === 'lost') return status;
  if (status === 'active') return 'active';
  return statusForStage(stageId);
}

function defaultGroupMemberIds(groupId: string, members: TeamMember[]) {
  if (groupId === defaultTeamGroupIds.managers) {
    const managers = members.filter((member) => member.role === 'manager').map((member) => member.id);
    return managers.length ? managers : members.map((member) => member.id);
  }
  if (groupId === defaultTeamGroupIds.leaders) {
    const leaders = members.filter((member) => member.role === 'owner' || member.role === 'admin').map((member) => member.id);
    return leaders.length ? leaders : members.map((member) => member.id);
  }
  return members.map((member) => member.id);
}

function syncDefaultGroups(groups: TeamGroup[], members: TeamMember[]) {
  const memberIds = new Set(members.map((member) => member.id));
  return groups.map((group) => {
    if (!group.isDefault) {
      return {
        ...group,
        memberIds: group.memberIds.filter((id) => memberIds.has(id)),
      };
    }

    return {
      ...group,
      memberIds: defaultGroupMemberIds(group.id, members),
    };
  });
}

function normalizeRepairData(repair: Partial<RepairData> | undefined, companyName?: string): RepairData {
  const fallback = createEmptyRepairData(companyName);
  const site = {
    ...fallback.site,
    ...(repair?.site ?? {}),
    username: repair?.site?.username?.trim() || fallback.site.username,
    services: repair?.site?.services?.length ? repair.site.services : fallback.site.services,
    advantages: repair?.site?.advantages?.length ? repair.site.advantages : fallback.site.advantages,
    process: repair?.site?.process?.length ? repair.site.process : fallback.site.process,
    cities: repair?.site?.cities?.length ? repair.site.cities : fallback.site.cities,
  };

  return {
    ...fallback,
    ...(repair ?? {}),
    site,
    clients: repair?.clients ?? [],
    projects: repair?.projects ?? [],
    stages: repair?.stages ?? [],
    tasks: repair?.tasks ?? [],
    materials: repair?.materials ?? [],
    payments: repair?.payments ?? [],
    photoReports: (repair?.photoReports ?? []).map((report) => ({
      ...report,
      media: report.media?.length
        ? report.media
        : report.imageUrl
          ? [{ id: `${report.id}-image`, type: 'image' as const, url: report.imageUrl, name: report.title }]
          : [],
    })),
    documents: repair?.documents ?? [],
    documentTemplates: repair?.documentTemplates?.length ? repair.documentTemplates : fallback.documentTemplates,
    approvals: repair?.approvals ?? [],
    chatThreads: repair?.chatThreads ?? [],
    chatMessages: (repair?.chatMessages ?? []).map((message) => ({ ...message, attachments: message.attachments ?? [] })),
  };
}

function migrateCompanyDataForVertical(data: CompanyData | null, owner: User, vertical: CompanyVertical, companyName?: string): CompanyData {
  const base = data ?? createEmptyCompanyData(owner);
  const createdAt = new Date().toISOString();
  const pipelineStages = (base.pipelineStages?.length ? base.pipelineStages : createDefaultPipelineStages(createdAt))
    .map((stage, index) => ({
      ...stage,
      order: Number.isFinite(stage.order) ? stage.order : index,
      color: stage.color || '#64748b',
    }))
    .sort((a, b) => a.order - b.order)
    .map((stage, index) => ({ ...stage, order: index }));
  const roles = base.roles?.length ? base.roles : createDefaultRoles(createdAt);
  const ownerMember: TeamMember = {
    id: owner.id,
    name: owner.name,
    email: owner.email,
    phone: owner.phone,
    role: owner.role,
    status: owner.active === false ? 'inactive' : 'active',
    avatarDataUrl: owner.avatarDataUrl,
  };
  const memberMap = new Map<string, TeamMember>();
  [...(base.teamMembers ?? []), ownerMember].forEach((member) => {
    memberMap.set(member.id, {
      ...member,
      role: member.role ?? 'manager',
      status: member.status ?? 'active',
      avatarDataUrl: member.avatarDataUrl,
    });
  });
  const teamMembers = Array.from(memberMap.values());
  const existingTeamGroups = base.teamGroups?.length
    ? base.teamGroups
    : createDefaultTeamGroups(owner.id, teamMembers, createdAt);
  const teamGroups = syncDefaultGroups(
    existingTeamGroups.map((group) => ({
      ...group,
      name: group.name?.trim() || 'Команда',
      memberIds: Array.isArray(group.memberIds) ? group.memberIds : [],
      createdBy: group.createdBy || owner.id,
      createdAt: group.createdAt ?? createdAt,
    })),
    teamMembers,
  );
  const fallbackGroupId = teamGroups[0]?.id ?? defaultTeamGroupIds.all;
  const groupIds = new Set(teamGroups.map((group) => group.id));

  const deals = (base.deals ?? []).map((deal) => {
    const legacyStage = deal.stage as DealStage | undefined;
    const stageId = normalizeStageId(deal.stageId ?? legacyStage, pipelineStages);
    return {
      ...deal,
      stageId,
      stage: legacyStage,
      status: normalizeLegacyStatus(deal.status, stageId),
      comments: deal.comments ?? [],
      taskIds: deal.taskIds ?? [],
      updatedAt: deal.updatedAt ?? deal.createdAt ?? createdAt,
      createdAt: deal.createdAt ?? createdAt,
    };
  });

  const tasks = (base.tasks ?? []).map((task) => ({
    ...task,
    status: task.status === 'done' ? ('done' as const) : ('active' as const),
    createdAt: task.createdAt ?? createdAt,
  }));

  return {
	    deals,
	    tasks,
	    teamMembers,
	    teamGroups,
	    pipelineStages,
    pipelineAutomations: (base.pipelineAutomations?.length ? base.pipelineAutomations : createDefaultPipelineAutomations(createdAt)).map((automation) => ({
      ...automation,
      type: automation.type ?? ('robot' as PipelineAutomationType),
      stageId: normalizeStageId(automation.stageId, pipelineStages),
      enabled: automation.enabled ?? true,
      createdAt: automation.createdAt ?? createdAt,
	    })),
	    teamMessages: (base.teamMessages ?? []).map((message) => ({
	      ...message,
	      groupId: groupIds.has(message.groupId) ? message.groupId : fallbackGroupId,
	      createdAt: message.createdAt ?? createdAt,
	    })),
    roles,
    settings: {
      ...createDefaultSettings(),
      ...(base.settings ?? {}),
      automation: base.settings?.automation ?? createDefaultSettings().automation,
    },
    repair: vertical === 'repair' ? normalizeRepairData(base.repair, companyName) : undefined,
  };
}

export function CrmDataProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, company, createCompanyUser, updateCompanyUser, deleteCompanyUser } = useAuth();
  const [data, setData] = useState<CompanyData>(emptyData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setData(emptyData);
      setLoading(false);
      return;
    }

    const key = storageKeys.companyData(currentUser.companyId);
    const companyData = readJson<CompanyData | null>(key, null);
    const nextData = migrateCompanyDataForVertical(companyData, currentUser, company?.vertical ?? 'sales', company?.name);
    writeJson(key, nextData);
    setData(nextData);
    setLoading(false);
  }, [company?.name, company?.vertical, currentUser]);

  const persist = useCallback(
    (updater: (current: CompanyData) => CompanyData) => {
      setData((current) => {
        if (!currentUser) return current;
        const nextData = updater(current);
        writeJson(storageKeys.companyData(currentUser.companyId), nextData);
        return nextData;
      });
    },
    [currentUser],
  );

  useEffect(() => {
    if (!currentUser) return;

    const touchPresence = () => {
      const timestamp = new Date().toISOString();
      persist((current) => ({
        ...current,
        teamMembers: current.teamMembers.map((member) =>
          member.id === currentUser.id
            ? {
                ...member,
                isOnline: true,
                lastSeenAt: timestamp,
              }
            : member,
        ),
      }));
    };

    touchPresence();
    const intervalId = window.setInterval(touchPresence, 60000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') touchPresence();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, persist]);

  const createDeal = useCallback(
    (payload: DealPayload) => {
      const timestamp = new Date().toISOString();
      const deal: Deal = {
        id: crypto.randomUUID(),
        title: payload.title,
        clientName: payload.clientName,
        phone: payload.phone,
        amount: payload.amount,
        stageId: payload.stageId,
        stage: payload.stageId as DealStage,
        status: payload.status,
        assignedTo: payload.assignedTo,
        createdAt: timestamp,
        updatedAt: timestamp,
        comments: [],
        taskIds: [],
      };
      persist((current) => ({ ...current, deals: [deal, ...current.deals] }));
      return deal;
    },
    [persist],
  );

  const updateDeal = useCallback(
    (id: string, payload: Partial<DealPayload>) => {
      persist((current) => ({
        ...current,
        deals: current.deals.map((deal) =>
          deal.id === id
            ? {
                ...deal,
                ...payload,
                stage: (payload.stageId ?? deal.stageId) as DealStage,
                updatedAt: new Date().toISOString(),
              }
            : deal,
        ),
      }));
    },
    [persist],
  );

  const moveDeal = useCallback(
    (id: string, stageId: string) => {
      persist((current) => ({
        ...current,
        deals: current.deals.map((deal) =>
          deal.id === id
            ? {
                ...deal,
                stageId,
                stage: stageId as DealStage,
                status: stageId === 'won' || stageId === 'lost' ? statusForStage(stageId) : deal.status,
                updatedAt: new Date().toISOString(),
              }
            : deal,
        ),
      }));
    },
    [persist],
  );

  const deleteDeal = useCallback(
    (id: string) => {
      persist((current) => ({
        ...current,
        deals: current.deals.filter((deal) => deal.id !== id),
        tasks: current.tasks.filter((task) => task.dealId !== id),
      }));
    },
    [persist],
  );

  const addComment = useCallback(
    (dealId: string, text: string) => {
      if (!currentUser) return;
      const comment: DealComment = {
        id: crypto.randomUUID(),
        authorId: currentUser.id,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };
      persist((current) => ({
        ...current,
        deals: current.deals.map((deal) =>
          deal.id === dealId
            ? { ...deal, comments: [...deal.comments, comment], updatedAt: new Date().toISOString() }
            : deal,
        ),
      }));
    },
    [currentUser, persist],
  );

  const createTask = useCallback(
    (payload: TaskPayload) => {
      const task: CrmTask = {
        id: crypto.randomUUID(),
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate,
        assignedTo: payload.assignedTo,
        dealId: payload.dealId,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      persist((current) => ({
        ...current,
        tasks: [task, ...current.tasks],
        deals: current.deals.map((deal) =>
          payload.dealId === deal.id ? { ...deal, taskIds: [...deal.taskIds, task.id] } : deal,
        ),
      }));
      return task;
    },
    [persist],
  );

  const updateTask = useCallback(
    (id: string, payload: Partial<TaskPayload>) => {
      persist((current) => {
        const existingTask = current.tasks.find((task) => task.id === id);
        return {
          ...current,
          tasks: current.tasks.map((task) => (task.id === id ? { ...task, ...payload } : task)),
          deals: current.deals.map((deal) => {
            const shouldRemove = existingTask?.dealId === deal.id && payload.dealId !== undefined && payload.dealId !== deal.id;
            const shouldAdd = payload.dealId === deal.id && !deal.taskIds.includes(id);
            if (shouldRemove) return { ...deal, taskIds: deal.taskIds.filter((taskId) => taskId !== id) };
            if (shouldAdd) return { ...deal, taskIds: [...deal.taskIds, id] };
            return deal;
          }),
        };
      });
    },
    [persist],
  );

  const completeTask = useCallback(
    (id: string) => {
      persist((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === id ? { ...task, status: 'done' } : task)),
      }));
    },
    [persist],
  );

  const deleteTask = useCallback(
    (id: string) => {
      persist((current) => ({
        ...current,
        tasks: current.tasks.filter((task) => task.id !== id),
        deals: current.deals.map((deal) => ({ ...deal, taskIds: deal.taskIds.filter((taskId) => taskId !== id) })),
      }));
    },
    [persist],
  );

  const createTeamMember = useCallback(
    async (payload: TeamMemberPayload) => {
      const user = await createCompanyUser(payload);
	      const member: TeamMember = {
	        id: user.id,
	        name: user.name,
	        email: user.email,
	        phone: user.phone,
	        role: user.role,
	        status: 'active',
	        avatarDataUrl: user.avatarDataUrl,
	        isOnline: false,
	        loginCount: 0,
	        logoutCount: 0,
	      };
	      persist((current) => {
	        const teamMembers = [...current.teamMembers, member];
	        return {
	          ...current,
	          teamMembers,
	          teamGroups: syncDefaultGroups(current.teamGroups, teamMembers),
	        };
	      });
	      return member;
	    },
    [createCompanyUser, persist],
  );

  const updateTeamMember = useCallback(
    (id: string, payload: Partial<TeamMemberPayload>) => {
      updateCompanyUser(id, {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
        avatarDataUrl: payload.avatarDataUrl,
      });
	      persist((current) => {
	        const teamMembers = current.teamMembers.map((member) => (member.id === id ? { ...member, ...payload } : member));
	        return {
	          ...current,
	          teamMembers,
	          teamGroups: syncDefaultGroups(current.teamGroups, teamMembers),
	        };
	      });
	    },
    [persist, updateCompanyUser],
  );

  const toggleTeamMemberStatus = useCallback(
    (id: string) => {
      persist((current) => ({
        ...current,
        teamMembers: current.teamMembers.map((member) => {
          if (member.id !== id) return member;
          const status = member.status === 'active' ? 'inactive' : 'active';
          updateCompanyUser(id, { active: status === 'active' });
          return { ...member, status };
        }),
      }));
    },
    [persist, updateCompanyUser],
  );

  const deleteTeamMember = useCallback(
    (id: string) => {
      const fallbackOwner = currentUser?.id ?? data.teamMembers.find((member) => member.id !== id)?.id;
      deleteCompanyUser(id);
	      persist((current) => ({
	        ...current,
	        teamMembers: current.teamMembers.filter((member) => member.id !== id),
	        teamGroups: current.teamGroups.map((group) => ({
	          ...group,
	          memberIds: group.memberIds.filter((memberId) => memberId !== id),
	        })),
	        deals: current.deals.map((deal) =>
          deal.assignedTo === id && fallbackOwner ? { ...deal, assignedTo: fallbackOwner } : deal,
        ),
        tasks: current.tasks.map((task) =>
          task.assignedTo === id && fallbackOwner ? { ...task, assignedTo: fallbackOwner } : task,
        ),
      }));
    },
    [currentUser, data.teamMembers, deleteCompanyUser, persist],
  );

  const createPipelineStage = useCallback(
    (name: string, color: string) => {
      const stage: PipelineStage = {
        id: crypto.randomUUID(),
        name: name.trim(),
        color,
        order: data.pipelineStages.length,
        isDefault: false,
        createdAt: new Date().toISOString(),
      };
      persist((current) => ({ ...current, pipelineStages: [...current.pipelineStages, stage] }));
      return stage;
    },
    [data.pipelineStages.length, persist],
  );

  const updatePipelineStage = useCallback(
    (id: string, payload: Partial<Pick<PipelineStage, 'name' | 'color'>>) => {
      persist((current) => ({
        ...current,
        pipelineStages: current.pipelineStages.map((stage) =>
          stage.id === id ? { ...stage, ...payload, name: payload.name?.trim() ?? stage.name } : stage,
        ),
      }));
    },
    [persist],
  );

  const reorderPipelineStage = useCallback(
    (id: string, direction: 'up' | 'down') => {
      persist((current) => {
        const stages = [...current.pipelineStages].sort((a, b) => a.order - b.order);
        const index = stages.findIndex((stage) => stage.id === id);
        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        if (index < 0 || nextIndex < 0 || nextIndex >= stages.length) return current;
        const currentStage = stages[index];
        const targetStage = stages[nextIndex];
        if (!currentStage || !targetStage) return current;
        stages[index] = targetStage;
        stages[nextIndex] = currentStage;
        return {
          ...current,
          pipelineStages: stages.map((stage, order) => ({ ...stage, order })),
        };
      });
    },
    [persist],
  );

  const deletePipelineStage = useCallback(
    (id: string, transferStageId?: string) => {
      let deleted = false;
      persist((current) => {
        if (current.pipelineStages.length <= 1) return current;
        const hasDeals = current.deals.some((deal) => deal.stageId === id);
        const targetStageId = transferStageId && transferStageId !== id ? transferStageId : undefined;
        if (hasDeals && !targetStageId) return current;
        deleted = true;
        const stages = current.pipelineStages.filter((stage) => stage.id !== id).map((stage, order) => ({ ...stage, order }));
        return {
          ...current,
          pipelineStages: stages,
          deals: current.deals.map((deal) =>
            deal.stageId === id && targetStageId
              ? { ...deal, stageId: targetStageId, stage: targetStageId as DealStage, updatedAt: new Date().toISOString() }
              : deal,
          ),
        };
      });
      return deleted;
    },
    [persist],
  );

  const createPipelineAutomation = useCallback(
    (payload: Omit<PipelineAutomation, 'id' | 'createdAt'>) => {
      const automation: PipelineAutomation = {
        ...payload,
        id: crypto.randomUUID(),
        name: payload.name.trim(),
        message: payload.message.trim(),
        createdAt: new Date().toISOString(),
      };
      persist((current) => ({ ...current, pipelineAutomations: [automation, ...current.pipelineAutomations] }));
      return automation;
    },
    [persist],
  );

  const updatePipelineAutomation = useCallback(
    (id: string, payload: Partial<Pick<PipelineAutomation, 'type' | 'name' | 'stageId' | 'message' | 'enabled'>>) => {
      persist((current) => ({
        ...current,
        pipelineAutomations: current.pipelineAutomations.map((automation) =>
          automation.id === id
            ? {
                ...automation,
                ...payload,
                name: payload.name?.trim() ?? automation.name,
                message: payload.message?.trim() ?? automation.message,
              }
            : automation,
        ),
      }));
    },
    [persist],
  );

	  const deletePipelineAutomation = useCallback(
	    (id: string) => {
	      persist((current) => ({
	        ...current,
	        pipelineAutomations: current.pipelineAutomations.filter((automation) => automation.id !== id),
	      }));
	    },
	    [persist],
	  );

	  const createTeamGroup = useCallback(
	    (name: string, memberIds: string[]) => {
	      if (!currentUser || !name.trim()) return null;
	      const existingMemberIds = new Set(data.teamMembers.map((member) => member.id));
	      const normalizedMemberIds = Array.from(new Set(memberIds.filter((memberId) => existingMemberIds.has(memberId))));
	      const group: TeamGroup = {
	        id: crypto.randomUUID(),
	        name: name.trim(),
	        memberIds: normalizedMemberIds.length ? normalizedMemberIds : [currentUser.id],
	        createdBy: currentUser.id,
	        createdAt: new Date().toISOString(),
	        isDefault: false,
	      };
	      persist((current) => ({ ...current, teamGroups: [...current.teamGroups, group] }));
	      return group;
	    },
	    [currentUser, data.teamMembers, persist],
	  );

	  const addTeamMessage = useCallback(
	    (groupId: string, text: string, taskId?: string) => {
	      if (!currentUser || !text.trim()) return null;
	      const targetGroupId = data.teamGroups.some((group) => group.id === groupId) ? groupId : data.teamGroups[0]?.id;
	      if (!targetGroupId) return null;
	      const message: TeamMessage = {
	        id: crypto.randomUUID(),
	        groupId: targetGroupId,
	        authorId: currentUser.id,
	        text: text.trim(),
	        taskId,
	        createdAt: new Date().toISOString(),
	      };
	      persist((current) => ({ ...current, teamMessages: [...current.teamMessages, message] }));
	      return message;
	    },
	    [currentUser, data.teamGroups, persist],
	  );

  const updateCompanySettings = useCallback(
    (payload: Partial<CompanySettings>) => {
      persist((current) => ({ ...current, settings: { ...current.settings, ...payload } }));
    },
    [persist],
  );

  const updateRepairData = useCallback(
    (updater: (repair: RepairData) => RepairData) => {
      persist((current) => ({
        ...current,
        repair: updater(current.repair ?? createEmptyRepairData(company?.name)),
      }));
    },
    [company?.name, persist],
  );

  const createRole = useCallback(
    (name: string, permissions: Permission[]) => {
      const role: RoleDefinition = {
        id: crypto.randomUUID(),
        name: name.trim(),
        permissions,
        isDefault: false,
        createdAt: new Date().toISOString(),
      };
      persist((current) => ({ ...current, roles: [...current.roles, role] }));
      return role;
    },
    [persist],
  );

  const updateRole = useCallback(
    (id: string, payload: Partial<Pick<RoleDefinition, 'name' | 'permissions'>>) => {
      persist((current) => ({
        ...current,
        roles: current.roles.map((role) => {
          if (role.id !== id || role.id === 'owner') return role;
          return { ...role, ...payload, name: payload.name?.trim() ?? role.name };
        }),
      }));
    },
    [persist],
  );

  const deleteRole = useCallback(
    (id: string) => {
      if (isDefaultRole(id)) return false;
      data.teamMembers.filter((member) => member.role === id).forEach((member) => updateCompanyUser(member.id, { role: 'manager' }));
      persist((current) => ({
        ...current,
        roles: current.roles.filter((role) => role.id !== id),
        teamMembers: current.teamMembers.map((member) => (member.role === id ? { ...member, role: 'manager' } : member)),
      }));
      return true;
    },
    [data.teamMembers, persist, updateCompanyUser],
  );

  const value = useMemo<CrmDataContextValue>(
    () => ({
      ...data,
      loading,
      createDeal,
      updateDeal,
      moveDeal,
      deleteDeal,
      addComment,
      createTask,
      updateTask,
      completeTask,
      deleteTask,
      createTeamMember,
      updateTeamMember,
      toggleTeamMemberStatus,
      deleteTeamMember,
      createPipelineStage,
      updatePipelineStage,
      reorderPipelineStage,
      deletePipelineStage,
	      createPipelineAutomation,
	      updatePipelineAutomation,
	      deletePipelineAutomation,
	      createTeamGroup,
	      addTeamMessage,
	      updateCompanySettings,
      createRole,
      updateRole,
      deleteRole,
      updateRepairData,
    }),
    [
      addComment,
      addTeamMessage,
      completeTask,
      createDeal,
      createPipelineAutomation,
	      createPipelineStage,
	      createRole,
	      createTask,
	      createTeamGroup,
	      createTeamMember,
      data,
      deleteDeal,
      deletePipelineAutomation,
      deletePipelineStage,
      deleteRole,
      deleteTask,
      deleteTeamMember,
      loading,
      moveDeal,
      reorderPipelineStage,
      toggleTeamMemberStatus,
      updateCompanySettings,
      updateDeal,
      updatePipelineAutomation,
      updatePipelineStage,
      updateRole,
      updateTask,
      updateTeamMember,
      updateRepairData,
    ],
  );

  return <CrmDataContext.Provider value={value}>{children}</CrmDataContext.Provider>;
}

export function useCrmData() {
  const context = useContext(CrmDataContext);
  if (!context) throw new Error('useCrmData must be used inside CrmDataProvider');
  return context;
}
