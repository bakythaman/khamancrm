'use client';

import { Edit3, Mail, PauseCircle, PlayCircle, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TeamMemberFormModal } from '@/components/forms/team-member-form-modal';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { hasPermission } from '@/lib/permissions';
import type { TeamMember } from '@/lib/storage/types';

export default function TeamPage() {
  const { currentUser } = useAuth();
  const { teamMembers, deals, tasks, roles, createTeamMember, updateTeamMember, toggleTeamMemberStatus, deleteTeamMember } = useCrmData();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | undefined>();

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

  const canManageTeam = hasPermission(currentUser, roles, 'manage_team');
  const adminLikeMembers = teamMembers.filter((member) => member.role === 'owner' || member.role === 'admin');

  function roleLabel(roleId: string) {
    const role = roles.find((item) => item.id === roleId);
    return role?.isDefault ? t(`statuses.${role.id}`) : role?.name ?? roleId;
  }

  async function handleDelete(member: TeamMember) {
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
    if (member.id === currentUser?.id) {
      showToast(t('team.cannotDeactivateSelf'), 'danger');
      return;
    }
    toggleTeamMemberStatus(member.id);
    showToast(member.status === 'active' ? t('team.memberDeactivated') : t('team.memberActivated'));
  }

  if (!canManageTeam) {
    return <EmptyState icon={ShieldCheck} title={t('navigation.team')} description={t('settings.criticalHidden')} />;
  }

  return (
    <div>
      <PageHeader
        title={t('team.title')}
        eyebrow={t('team.subtitle')}
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            {t('buttons.addMember')}
          </Button>
        }
      />

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
        <div className="grid grid-cols-[minmax(220px,1.2fr)_repeat(3,minmax(92px,0.5fr))_160px] gap-3 border-b bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-500 max-lg:hidden">
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

            return (
              <div key={member.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(220px,1.2fr)_repeat(3,minmax(92px,0.5fr))_160px] lg:items-center">
                <div className="flex items-center gap-3">
                  <Avatar name={member.name} />
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
                  <div className="flex shrink-0 items-center gap-1 rounded-md bg-white">
                    <Button variant="ghost" size="icon" title={t('common.edit')} onClick={() => setEditingMember(member)}>
                      <Edit3 className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon" title={t('common.email')} onClick={() => showToast(t('notifications.copied'))}>
                      {member.role === 'owner' ? <ShieldCheck className="h-4 w-4" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
                    </Button>
                    <Button variant="ghost" size="icon" title={member.status === 'active' ? t('team.deactivate') : t('team.activate')} onClick={() => handleToggleStatus(member)}>
                      {member.status === 'active' ? <PauseCircle className="h-4 w-4" aria-hidden /> : <PlayCircle className="h-4 w-4" aria-hidden />}
                    </Button>
                    <Button variant="ghost" size="icon" title={t('common.delete')} onClick={() => void handleDelete(member)}>
                      <Trash2 className="h-4 w-4 text-rose-600" aria-hidden />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

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
