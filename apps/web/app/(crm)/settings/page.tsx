'use client';

import { ArrowDown, ArrowUp, Bell, Bot, CheckCircle2, ImageIcon, LogOut, MessageCircle, Phone, Plus, Settings2, ShieldCheck, Trash2, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { allPermissions, hasPermission, isDefaultRole } from '@/lib/permissions';
import type { Language, Permission, PipelineStage, RoleDefinition } from '@/lib/storage/types';

const stageColors = ['#64748b', '#2563eb', '#d97706', '#059669', '#e11d48', '#7c3aed'] as const;

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, company, updateProfile, updateCompany, updateLanguage, logout } = useAuth();
  const {
    deals,
    pipelineStages,
    roles,
    settings,
    teamMembers,
    updateTeamMember,
    updateCompanySettings,
    createPipelineStage,
    updatePipelineStage,
    reorderPipelineStage,
    deletePipelineStage,
    createRole,
    updateRole,
    deleteRole,
  } = useCrmData();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { t, language } = useTranslation();
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [companyName, setCompanyName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState<string>(stageColors[0]);
  const [newRoleName, setNewRoleName] = useState('');

  const canManageSettings = hasPermission(currentUser, roles, 'manage_settings');
  const canManagePipeline = hasPermission(currentUser, roles, 'manage_pipeline');
  const canManageRoles = hasPermission(currentUser, roles, 'manage_roles');
  const sortedStages = useMemo(() => [...pipelineStages].sort((a, b) => a.order - b.order), [pipelineStages]);

  useEffect(() => {
    if (currentUser) {
      setProfile({ name: currentUser.name, email: currentUser.email, phone: currentUser.phone });
    }
    if (company) setCompanyName(company.name);
  }, [company, currentUser]);

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateProfile(profile);
    if (currentUser) updateTeamMember(currentUser.id, profile);
    showToast(t('settings.profileUpdated'));
  }

  function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateCompany(companyName);
    showToast(t('settings.companyUpdated'));
  }

  function changeLanguage(nextLanguage: Language) {
    updateLanguage(nextLanguage);
    showToast(t('notifications.languageChanged'));
  }

  function handleLogout() {
    logout();
    showToast(t('auth.signOut'), 'info');
    router.push('/login');
  }

  async function toggleNotifications() {
    if (settings.notificationsEnabled) {
      updateCompanySettings({ notificationsEnabled: false });
      showToast(t('notifications.disabled'), 'info');
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      updateCompanySettings({ notificationsEnabled: false, notificationPermission: 'unsupported' });
      showToast(t('notifications.unsupported'), 'danger');
      return;
    }

    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission === 'denied') {
      updateCompanySettings({ notificationsEnabled: false, notificationPermission: permission });
      showToast(t('notifications.denied'), 'danger');
      return;
    }

    updateCompanySettings({ notificationsEnabled: true, notificationPermission: permission });
    showToast(t('notifications.enabled'));
  }

  function createStage() {
    if (!newStageName.trim()) {
      showToast(t('validation.required'), 'danger');
      return;
    }
    createPipelineStage(newStageName, newStageColor);
    setNewStageName('');
    setNewStageColor(stageColors[0]);
    showToast(t('settings.pipelineStageCreated'));
  }

  async function removeStage(stage: PipelineStage) {
    const stageDeals = deals.filter((deal) => deal.stageId === stage.id);
    const fallback = sortedStages.find((item) => item.id !== stage.id);
    if (!fallback) {
      showToast(t('settings.cannotDeleteLastStage'), 'danger');
      return;
    }
    const message = stageDeals.length
      ? t('settings.deleteStageWithDeals', { count: stageDeals.length, stage: fallback.name })
      : t('settings.deleteStageMessage');
    const confirmed = await confirm({
      title: t('settings.deleteStageTitle'),
      message,
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;
    const deleted = deletePipelineStage(stage.id, fallback.id);
    showToast(deleted ? t('settings.pipelineStageDeleted') : t('settings.cannotDeleteLastStage'), deleted ? 'success' : 'danger');
  }

  function createCustomRole() {
    if (!newRoleName.trim()) {
      showToast(t('validation.required'), 'danger');
      return;
    }
    createRole(newRoleName, ['view_dashboard', 'view_pipeline', 'view_tasks', 'view_settings']);
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

  function handleLogoUpload(file?: File) {
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
      updateCompanySettings({ logoDataUrl: String(reader.result) });
      showToast(t('settings.logoSaved'));
    };
    reader.readAsDataURL(file);
  }

  function toggleAutomation(index: number) {
    const automation = settings.automation.map((value, itemIndex) => (itemIndex === index ? !value : value));
    updateCompanySettings({ automation });
    showToast(t('notifications.saved'));
  }

  const integrations = [
    { label: 'WhatsApp Business', icon: MessageCircle, action: () => showToast(t('notifications.whatsappSoon'), 'info') },
    { label: t('buttons.callHistory'), icon: Phone, action: () => showToast(t('notifications.telephonySoon'), 'info') },
    { label: t('inbox.aiSummary'), icon: Bot, action: () => showToast(t('notifications.saved'), 'info') },
  ];

  return (
    <div>
      <PageHeader
        title={t('settings.title')}
        eyebrow={t('settings.subtitle')}
        action={
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4" aria-hidden />
            {t('buttons.logout')}
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.profile')}</CardTitle>
              <Settings2 className="h-4 w-4 text-neutral-500" aria-hidden />
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 sm:grid-cols-3" onSubmit={saveProfile}>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-neutral-700">{t('common.name')}</span>
                  <Input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-neutral-700">{t('common.email')}</span>
                  <Input value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-neutral-700">{t('common.phone')}</span>
                  <Input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
                </label>
                <div className="sm:col-span-3">
                  <Button>{t('buttons.saveChanges')}</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.language')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(['ru', 'kz'] as const).map((item) => (
                <Button key={item} variant={language === item ? 'default' : 'outline'} onClick={() => changeLanguage(item)}>
                  {t(`language.${item}`)}
                </Button>
              ))}
            </CardContent>
          </Card>

          {canManageSettings ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.companySettings')}</CardTitle>
                <Settings2 className="h-4 w-4 text-neutral-500" aria-hidden />
              </CardHeader>
              <CardContent className="space-y-4">
                <form className="flex flex-col gap-3 sm:flex-row" onSubmit={saveCompany}>
                  <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                  <Button>{t('buttons.saveChanges')}</Button>
                </form>
                <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-neutral-50 p-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-white">
                    {settings.logoDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={settings.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-neutral-400" aria-hidden />
                    )}
                  </div>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border bg-white px-4 text-sm font-medium transition hover:bg-neutral-50">
                    {t('settings.uploadLogo')}
                    <input className="hidden" type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(event) => handleLogoUpload(event.target.files?.[0])} />
                  </label>
                  {settings.logoDataUrl ? (
                    <Button variant="outline" onClick={() => updateCompanySettings({ logoDataUrl: undefined })}>
                      {t('settings.removeLogo')}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-4 text-sm text-neutral-500">{t('settings.criticalHidden')}</Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.notifications')}</CardTitle>
              <Bell className="h-4 w-4 text-neutral-500" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
                <p className="text-sm font-medium text-neutral-950">{t('settings.browserNotifications')}</p>
                <button
                  className={`h-6 w-10 rounded-full p-0.5 transition ${settings.notificationsEnabled ? 'bg-emerald-600' : 'bg-neutral-200'}`}
                  aria-label={t('settings.notifications')}
                  onClick={() => void toggleNotifications()}
                >
                  <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${settings.notificationsEnabled ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            </CardContent>
          </Card>

          {canManagePipeline ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.pipelineSettings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_72px_auto]">
                  <Input value={newStageName} onChange={(event) => setNewStageName(event.target.value)} placeholder={t('settings.newStage')} />
                  <input className="h-10 w-full rounded-md border bg-white p-1" type="color" value={newStageColor} onChange={(event) => setNewStageColor(event.target.value)} />
                  <Button onClick={createStage}>
                    <Plus className="h-4 w-4" aria-hidden />
                    {t('common.create')}
                  </Button>
                </div>
                <div className="space-y-2">
                  {sortedStages.map((stage) => (
                    <div key={stage.id} className="grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-[44px_1fr_72px_auto] sm:items-center">
                      <span className="h-5 w-5 rounded-full" style={{ backgroundColor: stage.color }} />
                      <Input
                        defaultValue={stage.isDefault ? t(`stages.${stage.id}`) : stage.name}
                        onBlur={(event) => updatePipelineStage(stage.id, { name: event.target.value })}
                      />
                      <input className="h-10 w-full rounded-md border bg-white p-1" type="color" value={stage.color} onChange={(event) => updatePipelineStage(stage.id, { color: event.target.value })} />
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title={t('settings.moveUp')} onClick={() => reorderPipelineStage(stage.id, 'up')}>
                          <ArrowUp className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon" title={t('settings.moveDown')} onClick={() => reorderPipelineStage(stage.id, 'down')}>
                          <ArrowDown className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon" title={t('common.delete')} onClick={() => void removeStage(stage)}>
                          <Trash2 className="h-4 w-4 text-rose-600" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {canManageRoles ? (
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

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.automation')}</CardTitle>
              <Zap className="h-4 w-4 text-neutral-500" aria-hidden />
            </CardHeader>
            <CardContent className="space-y-3">
              {[t('settings.autoTask'), t('settings.autoAssign'), t('settings.autoSummary')].map((item, index) => (
                <div key={item} className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden />
                    <p className="text-sm font-medium text-neutral-950">{item}</p>
                  </div>
                  <button
                    className={`h-6 w-10 rounded-full p-0.5 transition ${settings.automation[index] ? 'bg-emerald-600' : 'bg-neutral-200'}`}
                    aria-label={item}
                    onClick={() => toggleAutomation(index)}
                  >
                    <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${settings.automation[index] ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.integrations')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {integrations.map((integration) => {
                const Icon = integration.icon;
                return (
                  <button
                    key={integration.label}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border bg-white p-3 text-left transition hover:bg-neutral-50"
                    onClick={integration.action}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
                        <Icon className="h-4 w-4 text-neutral-700" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-neutral-950">{integration.label}</span>
                        <span className="block text-sm text-neutral-500">{t('common.empty')}</span>
                      </span>
                    </span>
                    <Badge tone="amber">{t('common.soon')}</Badge>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('navigation.team')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {teamMembers.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-lg border bg-white p-3 text-sm">
                  <span className="font-medium text-neutral-950">{member.name}</span>
                  <Badge tone={member.status === 'active' ? 'green' : 'neutral'}>{t(`statuses.${member.status}`)}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
