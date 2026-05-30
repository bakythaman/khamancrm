'use client';

import { Bell, Bot, ImageIcon, LogOut, MessageCircle, Phone, Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { hasPermission } from '@/lib/permissions';
import type { Language } from '@/lib/storage/types';

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, company, updateProfile, updateCompany, updateLanguage, logout } = useAuth();
  const { roles, settings, teamMembers, updateTeamMember, updateCompanySettings } = useCrmData();
  const { showToast } = useToast();
  const { t, language } = useTranslation();
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', avatarDataUrl: '' });
  const [companyName, setCompanyName] = useState('');
  const canManageSettings = hasPermission(currentUser, roles, 'manage_settings');

  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        avatarDataUrl: currentUser.avatarDataUrl ?? '',
      });
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

  function handleAvatarUpload(file?: File) {
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
      setProfile((current) => ({ ...current, avatarDataUrl: String(reader.result) }));
      showToast(t('team.avatarSaved'));
    };
    reader.readAsDataURL(file);
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
              <form className="space-y-4" onSubmit={saveProfile}>
                <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-neutral-50 p-3">
                  <Avatar name={profile.name || 'Khaman'} src={profile.avatarDataUrl} className="h-12 w-12" />
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border bg-white px-4 text-sm font-medium transition hover:bg-neutral-50">
                    {t('team.uploadAvatar')}
                    <input className="hidden" type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(event) => handleAvatarUpload(event.target.files?.[0])} />
                  </label>
                  {profile.avatarDataUrl ? (
                    <Button type="button" variant="outline" onClick={() => setProfile((current) => ({ ...current, avatarDataUrl: '' }))}>
                      {t('team.removeAvatar')}
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
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
                </div>
                <Button>{t('buttons.saveChanges')}</Button>
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
