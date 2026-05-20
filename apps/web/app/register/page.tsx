'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';

export default function RegisterPage() {
  const router = useRouter();
  const { currentUser, register } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
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
      await register(form);
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
