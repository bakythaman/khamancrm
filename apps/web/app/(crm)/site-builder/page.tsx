'use client';

import { useRouter } from 'next/navigation';
import { Eye, LayoutTemplate, Palette, Save, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { createDefaultRepairSiteSettings, slugifyLandingUsername } from '@/lib/mock-data/seed';
import { hasPermission } from '@/lib/permissions';
import type { RepairSiteService, RepairSiteSettings } from '@/lib/storage/types';

function servicesToText(services: RepairSiteService[]) {
  return services.map((service) => `${service.title} - ${service.text}`).join('\n');
}

function parseServices(value: string): RepairSiteService[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...rest] = line.split(/[-:—]/);
      return {
        title: title?.trim() || line,
        text: rest.join(' - ').trim() || 'Описание услуги',
      };
    });
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function SiteBuilderPage() {
  const router = useRouter();
  const { company, currentUser } = useAuth();
  const { repair, roles, updateRepairData } = useCrmData();
  const { showToast } = useToast();
  const canEdit = company?.vertical === 'repair' && hasPermission(currentUser, roles, 'manage_settings');
  const initialSite = useMemo(() => repair?.site ?? createDefaultRepairSiteSettings(company?.name), [company?.name, repair?.site]);
  const [draft, setDraft] = useState<RepairSiteSettings>(initialSite);
  const [citiesText, setCitiesText] = useState(initialSite.cities.join(', '));
  const [servicesText, setServicesText] = useState(servicesToText(initialSite.services));
  const [advantagesText, setAdvantagesText] = useState(initialSite.advantages.join(', '));
  const [processText, setProcessText] = useState(initialSite.process.join(', '));
  const publicLandingPath = `/site?u=${slugifyLandingUsername(draft.username || draft.brandName || company?.name)}`;

  useEffect(() => {
    setDraft(initialSite);
    setCitiesText(initialSite.cities.join(', '));
    setServicesText(servicesToText(initialSite.services));
    setAdvantagesText(initialSite.advantages.join(', '));
    setProcessText(initialSite.process.join(', '));
  }, [initialSite]);

  function buildNextSite(): RepairSiteSettings {
    return {
      ...draft,
      username: slugifyLandingUsername(draft.username || draft.brandName || company?.name),
      cities: splitList(citiesText),
      services: parseServices(servicesText),
      advantages: splitList(advantagesText),
      process: splitList(processText),
    };
  }

  function saveSite() {
    const nextSite = buildNextSite();
    updateRepairData((current) => ({ ...current, site: nextSite }));
    setDraft(nextSite);
    showToast('Лендинг обновлен');
    return nextSite;
  }

  function saveAndOpenLanding() {
    const nextSite = saveSite();
    router.push(`/site?u=${nextSite.username}`);
  }

  if (!canEdit) {
    return <EmptyState icon={ShieldCheck} title="Редактор лендинга" description="Редактор доступен владельцу, админу или менеджеру ремонтной компании." />;
  }

  return (
    <div>
      <PageHeader
        title="Редактор лендинга"
        eyebrow={`${company?.name ?? 'Компания'} · конструктор лендинга`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={saveAndOpenLanding}>
                <Eye className="h-4 w-4" aria-hidden />
                Сохранить и открыть
            </Button>
            <Button onClick={saveSite}>
              <Save className="h-4 w-4" aria-hidden />
              Сохранить
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Главный экран</CardTitle>
              <LayoutTemplate className="h-4 w-4 text-neutral-500" aria-hidden />
            </CardHeader>
            <CardContent className="space-y-3">
              <EditorField label="Название на лендинге" value={draft.brandName} onChange={(value) => setDraft({ ...draft, brandName: value })} />
              <EditorField label="Юзернейм лендинга" value={draft.username} onChange={(value) => setDraft({ ...draft, username: slugifyLandingUsername(value, '') })} />
              <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500">Публичный адрес: {publicLandingPath}</p>
              <EditorField label="Заголовок" value={draft.headline} onChange={(value) => setDraft({ ...draft, headline: value })} />
              <EditorArea label="Описание" value={draft.subheadline} onChange={(value) => setDraft({ ...draft, subheadline: value })} />
              <EditorField label="Фон hero, URL картинки" value={draft.heroImageUrl} onChange={(value) => setDraft({ ...draft, heroImageUrl: value })} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Контакты и стиль</CardTitle>
              <Palette className="h-4 w-4 text-neutral-500" aria-hidden />
            </CardHeader>
            <CardContent className="space-y-3">
              <EditorField label="Телефон" value={draft.phone} onChange={(value) => setDraft({ ...draft, phone: value })} />
              <EditorField label="WhatsApp" value={draft.whatsapp} onChange={(value) => setDraft({ ...draft, whatsapp: value })} />
              <EditorField label="Адрес" value={draft.address} onChange={(value) => setDraft({ ...draft, address: value })} />
              <EditorField label="Города через запятую" value={citiesText} onChange={setCitiesText} />
              <div className="grid grid-cols-2 gap-3">
                <EditorField label="Основной цвет" type="color" value={draft.primaryColor} onChange={(value) => setDraft({ ...draft, primaryColor: value })} />
                <EditorField label="Акцент" type="color" value={draft.accentColor} onChange={(value) => setDraft({ ...draft, accentColor: value })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Блоки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <EditorArea label="Услуги: название - описание" value={servicesText} onChange={setServicesText} rows={6} />
              <EditorArea label="Преимущества через запятую" value={advantagesText} onChange={setAdvantagesText} />
              <EditorArea label="Процесс через запятую" value={processText} onChange={setProcessText} />
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div
            className="min-h-[520px] bg-neutral-950 text-white"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(10,10,10,0.86), rgba(10,10,10,0.45)), url(${draft.heroImageUrl})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
          >
            <div className="p-8">
              <Badge className="bg-white/12 text-white">{splitList(citiesText).join(' · ') || 'Города'}</Badge>
              <h2 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight">{draft.headline || 'Заголовок сайта'}</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/78">{draft.subheadline || 'Описание сайта'}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-md px-4 py-2 text-sm font-semibold text-white" style={{ background: draft.accentColor }}>
                  Рассчитать стоимость
                </span>
                <span className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold">Кабинет клиента</span>
              </div>
            </div>
          </div>

          <CardContent className="space-y-6 pt-5">
            <div>
              <p className="text-sm font-semibold text-neutral-950">Услуги</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {parseServices(servicesText).slice(0, 4).map((service) => (
                  <div key={service.title} className="rounded-lg border p-4">
                    <p className="font-semibold text-neutral-950">{service.title}</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-500">{service.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-950">Преимущества</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {splitList(advantagesText).map((item) => (
                  <span key={item} className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm">{item}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EditorField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function EditorArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <textarea
        className="w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
