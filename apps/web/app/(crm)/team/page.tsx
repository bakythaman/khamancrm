'use client';

import { Camera, CheckSquare, Edit3, Mail, MessageSquare, PauseCircle, PlayCircle, Plus, Search, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TeamMemberFormModal } from '@/components/forms/team-member-form-modal';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { allPermissions, hasPermission, isDefaultRole } from '@/lib/permissions';
import { addDays, formatDate } from '@/lib/date-utils';
import type { Permission, RoleDefinition, TeamMember } from '@/lib/storage/types';

type TeamTab = 'members' | 'chat' | 'roles';

export default function TeamPage() {
  const { currentUser } = useAuth();
  const {
    teamMembers,
    teamMessages,
    deals,
    tasks,
    roles,
    createTask,
    addTeamMessage,
    createTeamMember,
    updateTeamMember,
    toggleTeamMemberStatus,
    deleteTeamMember,
    createRole,
    updateRole,
    deleteRole,
  } = useCrmData();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<TeamTab>('members');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | undefined>();
  const [newRoleName, setNewRoleName] = useState('');
  const [message, setMessage] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('none');

  const canViewTeam = hasPermission(currentUser, roles, 'view_team');
  const canManageTeam = hasPermission(currentUser, roles, 'manage_team');
  const canManageRoles = hasPermission(currentUser, roles, 'manage_roles');
  const canCreateTask = hasPermission(currentUser, roles, 'create_task');
  const adminLikeMembers = teamMembers.filter((member) => member.role === 'owner' || member.role === 'admin');

  const members = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return teamMembers.filter(
      (member) =>
        !normalized ||
        member.name.toLowerCase().includes(normalized) ||
        member.email.toLowerCase().includes(normalized) ||
        member.phone.toLowerCase().includes(normalized) ||
        member.role.toLowerCase().includes(normalized),
    );
  }, [query, teamMembers]);

  const sortedMessages = useMemo(
    () => [...teamMessages].sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()),
    [teamMessages],
  );

  function roleLabel(roleId: string) {
    const role = roles.find((item) => item.id === roleId);
    return role?.isDefault ? t(`statuses.${role.id}`) : role?.name ?? roleId;
  }

  async function handleDelete(member: TeamMember) {
    if (!canManageTeam) return;
    if (member.id === currentUser?.id) {
      showToast(t('notifications.cannotDeleteSelf'), 'danger');
      return;
    }
    if ((member.role === 'owner' || member.role === 'admin') && adminLikeMembers.length <= 1) {
      showToast(t('team.cannotDeleteLastAdmin'), 'danger');
      return;
    }
    const confirmed = await confirm({
      title: t('team.deleteTitle'),
      message: t('team.deleteMessage'),
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;
    deleteTeamMember(member.id);
    showToast(t('team.memberDeleted'));
  }

  function handleToggleStatus(member: TeamMember) {
    if (!canManageTeam) return;
    if (member.id === currentUser?.id) {
      showToast(t('team.cannotDeactivateSelf'), 'danger');
      return;
    }
    toggleTeamMemberStatus(member.id);
    showToast(member.status === 'active' ? t('team.memberDeactivated') : t('team.memberActivated'));
  }

  function createCustomRole() {
    if (!newRoleName.trim()) {
      showToast(t('validation.required'), 'danger');
      return;
    }
    createRole(newRoleName, ['view_dashboard', 'view_pipeline', 'view_tasks', 'view_team', 'view_settings']);
    setNewRoleName('');
    showToast(t('settings.roleCreated'));
  }

  function togglePermission(role: RoleDefinition, permission: Permission) {
    if (role.id === 'owner') return;
    const permissions = role.permissions.includes(permission)
      ? role.permissions.filter((item) => item !== permission)
      : [...role.permissions, permission];
    updateRole(role.id, { permissions });
    showToast(t('settings.roleUpdated'));
  }

  async function removeRole(role: RoleDefinition) {
    if (isDefaultRole(role.id)) {
      showToast(t('settings.defaultRoleLocked'), 'danger');
      return;
    }
    const confirmed = await confirm({
      title: t('settings.deleteRoleTitle'),
      message: t('settings.deleteRoleMessage'),
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;
    deleteRole(role.id);
    showToast(t('settings.roleDeleted'));
  }

  function handleAvatarUpload(member: TeamMember, file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      showToast(t('settings.logoTypeError'), 'danger');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast(t('settings.logoSizeError'), 'danger');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateTeamMember(member.id, { avatarDataUrl: String(reader.result) });
      showToast(t('team.avatarSaved'));
    };
    reader.readAsDataURL(file);
  }

  function sendTeamMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      showToast(t('validation.required'), 'danger');
      return;
    }
    let taskId: string | undefined;
    if (canCreateTask && taskAssignee !== 'none') {
      const task = createTask({
        title: message.trim().slice(0, 80),
        description: message.trim(),
        dueDate: addDays(1).toISOString(),
        assignedTo: taskAssignee,
      });
      taskId = task.id;
    }
    addTeamMessage(message, taskId);
    setMessage('');
    setTaskAssignee('none');
    showToast(taskId ? t('team.messageTaskCreated') : t('team.messageSent'));
  }

  if (!canViewTeam) {
    return <EmptyState icon={ShieldCheck} title={t('navigation.team')} description={t('settings.criticalHidden')} />;
  }

  return (
    <div>
      <PageHeader
        title={t('team.title')}
        eyebrow={t('team.subtitle')}
        action={
          canManageTeam ? (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              {t('buttons.addMember')}
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {([
          ['members', Users, t('team.membersTab')],
          ['chat', MessageSquare, t('team.chatTab')],
          ['roles', ShieldCheck, t('settings.roleManagement')],
        ] as const).map(([tab, Icon, label]) => {
          if (tab === 'roles' && !canManageRoles) return null;
          return (
            <Button key={tab} variant={activeTab === tab ? 'default' : 'outline'} onClick={() => setActiveTab(tab)}>
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Button>
          );
        })}
      </div>

      {activeTab === 'members' ? (
        <>
          <div className="relative mb-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <Input
              className="pl-9"
              placeholder={t('team.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <Card className="overflow-hidden">
            <div className="grid grid-cols-[minmax(220px,1.2fr)_repeat(3,minmax(92px,0.5fr))_180px] gap-3 border-b bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-500 max-lg:hidden">
              <span>{t('common.manager')}</span>
              <span>{t('team.openChats')}</span>
              <span>{t('team.deals')}</span>
              <span>{t('team.reply')}</span>
              <span>{t('common.role')}</span>
            </div>

            <div className="divide-y">
              {members.map((member) => {
                const memberDeals = deals.filter((deal) => deal.assignedTo === member.id).length;
                const memberTasks = tasks.filter((task) => task.assignedTo === member.id && task.status === 'active').length;
                const canEditAvatar = member.id === currentUser?.id || canManageTeam;

                return (
                  <div key={member.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(220px,1.2fr)_repeat(3,minmax(92px,0.5fr))_180px] lg:items-center">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar name={member.name} src={member.avatarDataUrl} />
                        {canEditAvatar ? (
                          <label className="absolute -bottom-1 -right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border bg-white shadow-sm" title={t('team.uploadAvatar')}>
                            <Camera className="h-3 w-3 text-neutral-600" aria-hidden />
                            <input className="hidden" type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(event) => handleAvatarUpload(member, event.target.files?.[0])} />
                          </label>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-950">{member.name}</p>
                        <p className="truncate text-sm text-neutral-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm lg:block lg:bg-transparent lg:p-0">
                      <span className="text-neutral-500 lg:hidden">{t('team.openChats')}</span>
                      <span className="font-medium text-neutral-950">{memberTasks}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm lg:block lg:bg-transparent lg:p-0">
                      <span className="text-neutral-500 lg:hidden">{t('team.deals')}</span>
                      <span className="font-medium text-neutral-950">{memberDeals}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm lg:block lg:bg-transparent lg:p-0">
                      <span className="text-neutral-500 lg:hidden">{t('team.reply')}</span>
                      <span className="font-medium text-neutral-950">11m</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={member.role === 'owner' ? 'green' : member.role === 'admin' ? 'blue' : 'neutral'}>
                          {roleLabel(member.role)}
                        </Badge>
                        <Badge tone={member.status === 'active' ? 'green' : 'neutral'}>{t(`statuses.${member.status}`)}</Badge>
                      </div>
                      {canManageTeam ? (
                        <div className="flex shrink-0 items-center gap-1 rounded-md bg-white">
                          <Button variant="ghost" size="icon" title={t('common.edit')} onClick={() => setEditingMember(member)}>
                            <Edit3 className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button variant="ghost" size="icon" title={t('common.email')} onClick={() => navigator.clipboard?.writeText(member.email).then(() => showToast(t('notifications.copied')))}>
                            {member.role === 'owner' ? <ShieldCheck className="h-4 w-4" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
                          </Button>
                          <Button variant="ghost" size="icon" title={member.status === 'active' ? t('team.deactivate') : t('team.activate')} onClick={() => handleToggleStatus(member)}>
                            {member.status === 'active' ? <PauseCircle className="h-4 w-4" aria-hidden /> : <PlayCircle className="h-4 w-4" aria-hidden />}
                          </Button>
                          <Button variant="ghost" size="icon" title={t('common.delete')} onClick={() => void handleDelete(member)}>
                            <Trash2 className="h-4 w-4 text-rose-600" aria-hidden />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : null}

      {activeTab === 'chat' ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>{t('team.chatTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedMessages.length ? (
                sortedMessages.map((item) => {
                  const author = teamMembers.find((member) => member.id === item.authorId);
                  return (
                    <div key={item.id} className="flex gap-3 rounded-lg border bg-white p-3">
                      <Avatar name={author?.name ?? 'Khaman'} src={author?.avatarDataUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-neutral-950">{author?.name ?? t('common.manager')}</p>
                          <span className="text-xs text-neutral-500">{formatDate(item.createdAt, language)}</span>
                          {item.taskId ? <Badge tone="green">{t('team.taskFromMessage')}</Badge> : null}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{item.text}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState icon={MessageSquare} title={t('team.chatTitle')} description={t('team.noMessages')} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('team.newMessage')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={sendTeamMessage}>
                <textarea
                  className="min-h-32 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t('team.messagePlaceholder')}
                />
                {canCreateTask ? (
                  <select
                    value={taskAssignee}
                    onChange={(event) => setTaskAssignee(event.target.value)}
                    className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="none">{t('team.commentOnly')}</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {t('team.assignTaskTo')} {member.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <Button className="w-full">
                  <CheckSquare className="h-4 w-4" aria-hidden />
                  {t('team.sendMessage')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'roles' && canManageRoles ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.roleManagement')}</CardTitle>
            <ShieldCheck className="h-4 w-4 text-neutral-500" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder={t('settings.newRole')} />
              <Button onClick={createCustomRole}>{t('common.create')}</Button>
            </div>
            {roles.map((role) => (
              <div key={role.id} className="rounded-lg border bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="max-w-xs"
                    value={role.isDefault ? t(`statuses.${role.id}`) : role.name}
                    disabled={role.isDefault}
                    onChange={(event) => updateRole(role.id, { name: event.target.value })}
                  />
                  {role.isDefault ? <Badge>{t('settings.defaultRole')}</Badge> : null}
                  {!role.isDefault ? (
                    <Button variant="ghost" size="icon" onClick={() => void removeRole(role)} title={t('common.delete')}>
                      <Trash2 className="h-4 w-4 text-rose-600" aria-hidden />
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {allPermissions.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 rounded-md border bg-neutral-50 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={role.id === 'owner' || role.permissions.includes(permission)}
                        disabled={role.id === 'owner'}
                        onChange={() => togglePermission(role, permission)}
                      />
                      {t(`permissions.${permission}`)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <TeamMemberFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (payload) => {
          try {
            await createTeamMember(payload);
            setModalOpen(false);
            showToast(t('team.memberCreated'));
          } catch (error) {
            showToast(t(error instanceof Error ? error.message : 'validation.required'), 'danger');
          }
        }}
      />

      <TeamMemberFormModal
        open={Boolean(editingMember)}
        member={editingMember}
        onClose={() => setEditingMember(undefined)}
        onSubmit={(payload) => {
          if (!editingMember) return;
          if (
            (editingMember.role === 'owner' || editingMember.role === 'admin') &&
            payload.role !== 'owner' &&
            payload.role !== 'admin' &&
            adminLikeMembers.length <= 1
          ) {
            showToast(t('team.cannotDeleteLastAdmin'), 'danger');
            return;
          }
          updateTeamMember(editingMember.id, payload);
          setEditingMember(undefined);
          showToast(t('team.memberUpdated'));
        }}
      />
    </div>
  );
}
