'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/hooks/useTranslation';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, login } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nextPath, setNextPath] = useState('/dashboard');
  const [form, setForm] = useState({ email: '', password: '' });

  useEffect(() => {
    if (currentUser) router.replace('/dashboard');
  }, [currentUser, router]);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get('next');
    if (next?.startsWith('/')) setNextPath(next);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password) {
      setError(t('validation.required'));
      return;
    }
    if (!form.email.includes('@')) {
      setError(t('validation.invalidEmail'));
      return;
    }

    try {
      setLoading(true);
      await login(form);
      showToast(t('auth.loggedIn'));
      router.push(nextPath);
    } catch (caught) {
      const key = caught instanceof Error ? caught.message : 'validation.invalidCredentials';
      setError(t(key));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-950 text-sm font-bold text-white">
            K
          </span>
          <div>
            <h1 className="text-xl font-semibold text-neutral-950">{t('auth.loginTitle')}</h1>
            <p className="text-sm text-neutral-500">{t('auth.loginSubtitle')}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {error ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
          <label className="space-y-2">
            <span className="text-sm font-medium text-neutral-700">{t('common.email')}</span>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="you@company.com"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-neutral-700">{t('auth.password')}</span>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder={t('auth.password')}
            />
          </label>
          <Button className="w-full" disabled={loading}>
            <MessageCircle className="h-4 w-4" aria-hidden />
            {loading ? t('common.loading') : t('buttons.login')}
          </Button>
        </form>

        <div className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{t('auth.demoNote')}</div>
        <p className="mt-4 text-center text-sm text-neutral-500">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="font-medium text-emerald-700 hover:text-emerald-800">
            {t('auth.createAccount')}
          </Link>
        </p>
      </Card>
    </main>
  );
}
