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
import { isRepairPortalRole, landingPathForUser } from '@/lib/repair/roles';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, company, loading: authLoading, login, requestPasswordReset, resetPassword } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nextPath, setNextPath] = useState('/dashboard');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'code'>('email');
  const [form, setForm] = useState({ email: '', password: '' });
  const [resetForm, setResetForm] = useState({ email: '', code: '', password: '', confirmPassword: '' });

  useEffect(() => {
    if (!authLoading && currentUser && company) router.replace(landingPathForUser(currentUser, company));
  }, [authLoading, company, currentUser, router]);

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
      const session = await login(form);
      showToast(t('auth.loggedIn'));
      const roleLandingPath = landingPathForUser(session.user, session.company);
      const destination = isRepairPortalRole(session.user.role)
        ? roleLandingPath
        : nextPath !== '/dashboard' && nextPath !== '/repair'
          ? nextPath
          : roleLandingPath;
      router.replace(destination);
    } catch (caught) {
      const key = caught instanceof Error ? caught.message : 'validation.invalidCredentials';
      setError(t(key));
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      setLoading(true);
      if (resetStep === 'email') {
        if (!resetForm.email.includes('@')) {
          setError(t('validation.invalidEmail'));
          return;
        }
        await requestPasswordReset(resetForm.email);
        setResetStep('code');
        showToast(t('auth.codeSent'));
        return;
      }
      if (!resetForm.code.trim() || !resetForm.password || !resetForm.confirmPassword) {
        setError(t('validation.required'));
        return;
      }
      if (resetForm.password.length < 6) {
        setError(t('validation.passwordMin'));
        return;
      }
      if (resetForm.password !== resetForm.confirmPassword) {
        setError(t('validation.passwordMismatch'));
        return;
      }
      await resetPassword({ email: resetForm.email, code: resetForm.code, password: resetForm.password });
      setResetOpen(false);
      setResetStep('email');
      setForm((current) => ({ ...current, email: resetForm.email }));
      showToast(t('auth.passwordChanged'));
    } catch (caught) {
      const key = caught instanceof Error ? caught.message : 'validation.invalidCode';
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

        <button
          className="mt-3 w-full text-center text-sm font-medium text-emerald-700 hover:text-emerald-800"
          onClick={() => {
            setResetOpen((current) => !current);
            setResetForm((current) => ({ ...current, email: form.email || current.email }));
          }}
        >
          {t('auth.forgotPassword')}
        </button>

        {resetOpen ? (
          <form className="mt-4 space-y-3 rounded-lg border bg-neutral-50 p-3" onSubmit={submitReset}>
            <p className="text-sm font-semibold text-neutral-950">{t('auth.resetPassword')}</p>
            <Input
              type="email"
              value={resetForm.email}
              onChange={(event) => setResetForm({ ...resetForm, email: event.target.value })}
              placeholder={t('common.email')}
              disabled={resetStep === 'code'}
            />
            {resetStep === 'code' ? (
              <>
                <Input
                  value={resetForm.code}
                  onChange={(event) => setResetForm({ ...resetForm, code: event.target.value })}
                  placeholder={t('auth.resetCode')}
                />
                <Input
                  type="password"
                  value={resetForm.password}
                  onChange={(event) => setResetForm({ ...resetForm, password: event.target.value })}
                  placeholder={t('auth.newPassword')}
                />
                <Input
                  type="password"
                  value={resetForm.confirmPassword}
                  onChange={(event) => setResetForm({ ...resetForm, confirmPassword: event.target.value })}
                  placeholder={t('auth.confirmPassword')}
                />
              </>
            ) : null}
            <Button className="w-full" disabled={loading}>
              {resetStep === 'email' ? t('auth.sendCode') : t('buttons.saveChanges')}
            </Button>
          </form>
        ) : null}

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
