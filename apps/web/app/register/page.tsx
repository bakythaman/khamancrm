'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, MessageCircle, PaintRoller } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';
import { slugifyLandingUsername } from '@/lib/mock-data/seed';
import type { CompanyVertical } from '@/lib/storage/types';

export default function RegisterPage() {
  const router = useRouter();
  const { currentUser, register } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    companyName: string;
    companyVertical: CompanyVertical;
    repairSite: {
      username: string;
      headline: string;
      subheadline: string;
      cities: string;
      address: string;
      servicesText: string;
      primaryColor: string;
      accentColor: string;
    };
    password: string;
    confirmPassword: string;
  }>({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    companyVertical: 'repair',
    repairSite: {
      username: '',
      headline: 'Дизайн и ремонт под ключ',
      subheadline: 'Расскажите, какие услуги вы делаете и почему клиентам удобно работать с вами.',
      cities: 'Шымкент, Алматы',
      address: '',
      servicesText: 'Дизайн-проект - планировки, визуализации и чертежи\nРемонт под ключ - полный цикл работ до сдачи\nКомплектация - материалы, мебель и поставщики',
      primaryColor: '#111111',
      accentColor: '#d6a83f',
    },
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (currentUser) router.replace('/dashboard');
  }, [currentUser, router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.companyName.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError(t('validation.required'));
      return;
    }
    if (!form.email.includes('@')) {
      setError(t('validation.invalidEmail'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('validation.passwordMin'));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('validation.passwordMismatch'));
      return;
    }

    try {
      setLoading(true);
      await register({
        ...form,
        repairSite:
          form.companyVertical === 'repair'
            ? {
                ...form.repairSite,
                username: slugifyLandingUsername(form.repairSite.username || form.companyName),
                brandName: form.companyName,
                phone: form.phone,
                whatsapp: form.phone,
              }
            : undefined,
      });
      showToast(t('auth.registered'));
      router.push('/dashboard');
    } catch (caught) {
      const key = caught instanceof Error ? caught.message : 'validation.required';
      setError(t(key));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <Card className="w-full max-w-lg p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-950 text-sm font-bold text-white">
            K
          </span>
          <div>
            <h1 className="text-xl font-semibold text-neutral-950">{t('auth.registerTitle')}</h1>
            <p className="text-sm text-neutral-500">{t('auth.registerSubtitle')}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {error ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-neutral-700">{t('common.name')}</span>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-neutral-700">{t('auth.phone')}</span>
              <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
          </div>
          <label className="space-y-2">
            <span className="text-sm font-medium text-neutral-700">{t('common.email')}</span>
            <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-neutral-700">{t('auth.companyName')}</span>
            <Input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium text-neutral-700">Профиль CRM</span>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className={`rounded-lg border p-3 text-left transition ${form.companyVertical === 'repair' ? 'border-neutral-950 bg-neutral-50' : 'bg-white hover:bg-neutral-50'}`}
                onClick={() => setForm({ ...form, companyVertical: 'repair' })}
                type="button"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
                  <PaintRoller className="h-4 w-4" aria-hidden />
                  Ремонтная компания
                </span>
                <span className="mt-1 block text-xs leading-5 text-neutral-500">Лендинг, заявки, проекты, задачи рабочих и кабинет клиента.</span>
              </button>
              <button
                className={`rounded-lg border p-3 text-left transition ${form.companyVertical === 'sales' ? 'border-neutral-950 bg-neutral-50' : 'bg-white hover:bg-neutral-50'}`}
                onClick={() => setForm({ ...form, companyVertical: 'sales' })}
                type="button"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Продажи и заявки
                </span>
                <span className="mt-1 block text-xs leading-5 text-neutral-500">Воронка, задачи, команда и WhatsApp-first workflow.</span>
              </button>
            </div>
          </div>
          {form.companyVertical === 'repair' ? (
            <div className="space-y-3 rounded-lg border bg-neutral-50 p-3">
              <div>
                <p className="text-sm font-semibold text-neutral-950">Данные для лендинга компании</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">Из этих полей Khaman CRM соберет первый лендинг. Потом его можно редактировать в конструкторе.</p>
              </div>
              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700">Юзернейм лендинга</span>
                <Input
                  placeholder={slugifyLandingUsername(form.companyName || 'company')}
                  value={form.repairSite.username}
                  onChange={(event) => setForm({ ...form, repairSite: { ...form.repairSite, username: slugifyLandingUsername(event.target.value, '') } })}
                />
                <span className="block text-xs text-neutral-500">Адрес будет: /{form.repairSite.username || slugifyLandingUsername(form.companyName || 'company')}</span>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700">Главный заголовок</span>
                <Input value={form.repairSite.headline} onChange={(event) => setForm({ ...form, repairSite: { ...form.repairSite, headline: event.target.value } })} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700">Короткое описание</span>
                <textarea
                  className="min-h-20 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  value={form.repairSite.subheadline}
                  onChange={(event) => setForm({ ...form, repairSite: { ...form.repairSite, subheadline: event.target.value } })}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-neutral-700">Города через запятую</span>
                  <Input value={form.repairSite.cities} onChange={(event) => setForm({ ...form, repairSite: { ...form.repairSite, cities: event.target.value } })} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-neutral-700">Адрес офиса</span>
                  <Input value={form.repairSite.address} onChange={(event) => setForm({ ...form, repairSite: { ...form.repairSite, address: event.target.value } })} />
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-sm font-medium text-neutral-700">Услуги, каждая с новой строки</span>
                <textarea
                  className="min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  value={form.repairSite.servicesText}
                  onChange={(event) => setForm({ ...form, repairSite: { ...form.repairSite, servicesText: event.target.value } })}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-neutral-700">Основной цвет</span>
                  <Input type="color" value={form.repairSite.primaryColor} onChange={(event) => setForm({ ...form, repairSite: { ...form.repairSite, primaryColor: event.target.value } })} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-neutral-700">Акцентный цвет</span>
                  <Input type="color" value={form.repairSite.accentColor} onChange={(event) => setForm({ ...form, repairSite: { ...form.repairSite, accentColor: event.target.value } })} />
                </label>
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-neutral-700">{t('auth.password')}</span>
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-neutral-700">{t('auth.confirmPassword')}</span>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              />
            </label>
          </div>
          <Button className="w-full" disabled={loading}>
            <Building2 className="h-4 w-4" aria-hidden />
            {loading ? t('common.loading') : t('buttons.register')}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          {t('auth.hasAccount')}{' '}
          <Link href="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
            {t('auth.signIn')}
          </Link>
        </p>
      </Card>
    </main>
  );
}
