'use client';

import Link from 'next/link';
import { CheckCircle2, FileText, Home, LogOut, MessageSquareText, Paperclip, Send, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useCrmData } from '@/hooks/useCrmData';
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl';
import { formatAmount } from '@/lib/i18n/format';
import { getPublicRepairData, getPublicRepairDataByUsername, repairLandingPath, updatePublicRepairDataByUsername } from '@/lib/repair/platform';
import type { RepairApproval, RepairChatAttachment, RepairData, RepairReportMedia } from '@/lib/storage/types';

const clientSessionKey = 'khaman.repairClientSession';

function clientSessionStorageKey(username?: string) {
  return `${clientSessionKey}.${username || 'default'}`;
}

function getClientSession(username?: string) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(clientSessionStorageKey(username));
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function reportMediaItems(report: RepairData['photoReports'][number]): RepairReportMedia[] {
  if (report.media?.length) return report.media;
  return report.imageUrl ? [{ id: `${report.id}-image`, type: 'image', url: report.imageUrl, name: report.title }] : [];
}

export default function RepairClientPortalPage() {
  const { company } = useAuth();
  const { repair, updateRepairData } = useCrmData();
  const [landingUsername, setLandingUsername] = useState<string | null>(null);
  const [publicPlatform, setPublicPlatform] = useState<RepairData | null>(null);
  const platform = publicPlatform ?? getPublicRepairData(company?.vertical === 'repair' ? repair : undefined, company?.name);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ name: '', phone: '', email: '' });
  const [loginError, setLoginError] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [question, setQuestion] = useState('');
  const [chatText, setChatText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<RepairChatAttachment[]>([]);
  const landingPath = repairLandingPath(platform.site.username);

  useEffect(() => {
    const username = new URLSearchParams(window.location.search).get('u');
    setLandingUsername(username);
  }, []);

  useEffect(() => {
    setPublicPlatform(landingUsername ? getPublicRepairDataByUsername(landingUsername) : null);
  }, [landingUsername]);

  useEffect(() => {
    setClientId(getClientSession(platform.site.username));
  }, [platform.site.username]);

  const client = platform.clients.find((item) => item.id === clientId);
  const clientProjects = platform.projects.filter((project) => project.clientId === clientId);
  const activeProject = useMemo(() => {
    if (!clientProjects.length) return null;
    return clientProjects.find((project) => project.id === selectedProjectId) ?? clientProjects[0];
  }, [clientProjects, selectedProjectId]);

  useEffect(() => {
    if (activeProject && !selectedProjectId) setSelectedProjectId(activeProject.id);
  }, [activeProject, selectedProjectId]);

  const projectStages = platform.stages.filter((stage) => stage.projectId === activeProject?.id && stage.visibleForClient);
  const reports = platform.photoReports.filter((report) => report.projectId === activeProject?.id && report.visibleForClient);
  const documents = platform.documents.filter((document) => document.projectId === activeProject?.id && document.visibleForClient);
  const payments = platform.payments.filter((payment) => payment.projectId === activeProject?.id);
  const approvals = platform.approvals.filter((approval) => approval.projectId === activeProject?.id);
  const projectThread = platform.chatThreads.find((thread) => thread.projectId === activeProject?.id);
  const messages = platform.chatMessages.filter((message) => message.projectId === activeProject?.id);

  function mutateRepairData(updater: (repair: RepairData) => RepairData) {
    if (company?.vertical === 'repair') {
      updateRepairData(updater);
      return;
    }

    const nextRepair = updatePublicRepairDataByUsername(platform.site.username, updater);
    if (nextRepair) setPublicPlatform(nextRepair);
  }

  function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = loginForm.email.trim().toLowerCase();
    const phone = normalizePhone(loginForm.phone);
    const name = loginForm.name.trim();
    if (!name || !email || !phone) {
      setLoginError('Введите имя, телефон и почту, которые компания указала для вашего объекта.');
      return;
    }

    const foundClient = platform.clients.find(
      (item) => item.email.trim().toLowerCase() === email && [item.phone, item.whatsapp].some((value) => normalizePhone(value) === phone),
    );
    if (!foundClient) {
      setLoginError('Клиент с такими данными не найден. Проверьте телефон и почту.');
      return;
    }

    window.localStorage.setItem(clientSessionStorageKey(platform.site.username), foundClient.id);
    setClientId(foundClient.id);
    setLoginError('');
  }

  function logout() {
    window.localStorage.removeItem(clientSessionStorageKey(platform.site.username));
    setClientId(null);
    setSelectedProjectId('');
  }

  function updateApproval(approval: RepairApproval, status: RepairApproval['status'], comment?: string) {
    mutateRepairData((current) => ({
      ...current,
      approvals: current.approvals.map((item) =>
        item.id === approval.id
          ? {
              ...item,
              status,
              comment: comment?.trim() || item.comment,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : item,
      ),
    }));
    setQuestion('');
  }

  async function attachClientFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const attachments = await Promise.all(
      files.slice(0, 4).map(async (file) => ({
        id: crypto.randomUUID(),
        type: file.type.startsWith('image/') ? ('image' as const) : ('document' as const),
        name: file.name,
        url: await readFileAsDataUrl(file),
        createdAt: new Date().toISOString(),
      })),
    );
    setPendingAttachments((current) => [...current, ...attachments]);
    event.target.value = '';
  }

  function sendClientMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeProject || !client) return;
    if (!chatText.trim() && !pendingAttachments.length) return;
    mutateRepairData((current) => ({
      ...current,
      chatMessages: [
        ...current.chatMessages,
        {
          id: crypto.randomUUID(),
          projectId: activeProject.id,
          threadId: projectThread?.id,
          authorId: client.id,
          authorName: client.name,
          body: chatText.trim(),
          attachments: pendingAttachments,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setChatText('');
    setPendingAttachments([]);
  }

  if (!client) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-12 md:px-6">
          <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <Badge tone="green" className="bg-emerald-400/18 text-emerald-100">Кабинет клиента</Badge>
              <h1 className="mt-5 text-5xl font-semibold leading-tight">Ход объекта, документы и оплаты</h1>
              <p className="mt-5 max-w-xl text-white/68">
                Клиент видит только свой проект: прогресс, этапы, фотоотчеты, открытые файлы, платежи и согласования.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                  <Link href={landingPath}>На лендинг</Link>
                </Button>
                <Button asChild>
                  <Link href="/login">Вход команды</Link>
                </Button>
              </div>
            </div>
            <Card className="bg-white text-neutral-950">
              <CardHeader className="block">
                <CardTitle className="text-xl">Войти как клиент</CardTitle>
                <p className="mt-2 text-sm text-neutral-500">Введите имя, телефон и почту, которые ремонтная компания добавила к вашему объекту.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={login} className="space-y-4">
                  {loginError ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{loginError}</p> : null}
                  <Input placeholder="Имя" value={loginForm.name} onChange={(event) => setLoginForm({ ...loginForm, name: event.target.value })} />
                  <Input placeholder="Телефон" value={loginForm.phone} onChange={(event) => setLoginForm({ ...loginForm, phone: event.target.value })} />
                  <Input placeholder="Почта" type="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} />
                  <Button type="submit" className="w-full">Открыть кабинет</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  if (!activeProject) {
    return (
      <main className="min-h-screen bg-[#f7f5f0]">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
          <Card className="w-full">
            <CardHeader className="block">
              <CardTitle className="text-2xl">Проект еще не привязан</CardTitle>
              <p className="mt-2 text-sm text-neutral-500">Аккаунт клиента создан, но менеджер еще не связал его с объектом в разделе “Клиенты”.</p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link href={landingPath}>Лендинг</Link></Button>
              <Button onClick={logout}>Выйти</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5f0]">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <Link href={landingPath} className="text-xl font-semibold text-neutral-950">{platform.site.brandName}</Link>
            <p className="mt-1 text-sm text-neutral-500">Личный кабинет · {client.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {clientProjects.length > 1 ? (
              <select
                className="h-9 rounded-md border bg-white px-3 text-sm"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
              >
                {clientProjects.map((project) => (
                  <option value={project.id} key={project.id}>{project.title}</option>
                ))}
              </select>
            ) : null}
            <Button asChild variant="outline"><Link href={landingPath}>Лендинг</Link></Button>
            <Button asChild variant="outline"><Link href="/login">Вход команды</Link></Button>
            <Button size="icon" variant="ghost" onClick={logout} title="Выйти">
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader className="block">
              <Badge tone={activeProject.status === 'завершен' ? 'green' : 'amber'}>{activeProject.status}</Badge>
              <CardTitle className="mt-4 text-3xl">{activeProject.title}</CardTitle>
              <p className="mt-2 text-sm text-neutral-500">
                {activeProject.address} · {activeProject.area} м² · плановая сдача {formatDate(activeProject.dueDate)}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Общий прогресс</span>
                  <strong>{activeProject.progress}%</strong>
                </div>
                <Progress value={activeProject.progress} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <ClientStat icon={Home} label="Текущий этап" value={projectStages.find((stage) => stage.status === 'в работе')?.title ?? projectStages[0]?.title ?? 'В работе'} />
                <ClientStat icon={MessageSquareText} label="Последнее обновление" value={reports[0] ? formatDate(reports[0].date) : 'нет отчетов'} />
                <ClientStat icon={WalletCards} label="Остаток" value={formatAmount(activeProject.budget - activeProject.paid)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="block">
              <CardTitle className="text-lg">Оплаты</CardTitle>
              <p className="mt-1 text-sm text-neutral-500">Общая стоимость, оплачено и история платежей.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-neutral-950 p-4 text-white">
                <div className="flex justify-between text-sm text-white/65"><span>Стоимость</span><span>{formatAmount(activeProject.budget)}</span></div>
                <div className="mt-2 flex justify-between text-sm text-white/65"><span>Оплачено</span><span>{formatAmount(activeProject.paid)}</span></div>
                <div className="mt-4 flex justify-between text-lg font-semibold"><span>Остаток</span><span>{formatAmount(activeProject.budget - activeProject.paid)}</span></div>
              </div>
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span><strong>{payment.type}</strong><span className="block text-xs text-neutral-500">{formatDate(payment.date)}</span></span>
                    <span className="text-right"><span className="block font-semibold">{formatAmount(payment.amount)}</span><Badge tone={payment.status === 'оплачено' ? 'green' : 'amber'}>{payment.status}</Badge></span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader><CardTitle className="text-lg">Этапы проекта</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {projectStages.map((stage) => (
                <div key={stage.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{stage.title}</p>
                      <p className="mt-1 text-sm text-neutral-500">{stage.description}</p>
                    </div>
                    <Badge tone={stage.status === 'завершен' ? 'green' : stage.status === 'на проверке' ? 'amber' : 'neutral'}>{stage.status}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-neutral-500">
                    <span>Старт: {formatDate(stage.startDate)}</span>
                    <span>Дедлайн: {formatDate(stage.deadline)}</span>
                  </div>
                  <Progress value={stage.progress} className="mt-3" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Фотоотчеты</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {reports.map((report) => (
                <article key={report.id} className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-1">
                    {reportMediaItems(report).slice(0, 4).map((item) => (
                      <ClientReportMedia key={item.id} media={item} title={report.title} />
                    ))}
                    {!reportMediaItems(report).length ? <div className="col-span-2 flex h-48 items-center justify-center text-neutral-400">Без медиа</div> : null}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold">{report.title}</p>
                    <p className="mt-1 text-sm text-neutral-500">{report.description}</p>
                    <p className="mt-3 text-xs text-neutral-500">{formatDate(report.date)}</p>
                  </div>
                </article>
              ))}
              {!reports.length ? <p className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">Фотоотчеты появятся после первого выезда команды.</p> : null}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader className="block">
              <CardTitle className="text-lg">Чат с командой</CardTitle>
              <p className="mt-1 text-sm text-neutral-500">Вопросы по объекту, материалам, фото и срокам.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-80 space-y-3 overflow-auto rounded-lg bg-neutral-50 p-3">
                {messages.map((message) => (
                  <div key={message.id} className={`max-w-md rounded-lg p-3 ${message.authorId === client.id ? 'ml-auto bg-neutral-950 text-white' : 'bg-white'}`}>
                    <p className="text-xs opacity-70">{message.authorName}</p>
                    {message.body ? <p className="mt-1 text-sm">{message.body}</p> : null}
                    {message.attachments?.length ? (
                      <div className="mt-3 grid gap-2">
                        {message.attachments.map((attachment) => (
                          <a key={attachment.id} className={`rounded-md border px-3 py-2 text-xs ${message.authorId === client.id ? 'border-white/20 bg-white/10 text-white' : 'bg-neutral-50 text-neutral-700'}`} href={attachment.url} target="_blank" rel="noreferrer">
                            {attachment.type === 'image' ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={attachment.url} alt={attachment.name} className="mb-2 max-h-36 rounded object-cover" />
                            ) : null}
                            <span className="inline-flex items-center gap-2">
                              <Paperclip className="h-3 w-3" aria-hidden />
                              {attachment.name}
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                {!messages.length ? <p className="text-sm text-neutral-500">Сообщений пока нет.</p> : null}
              </div>
              {pendingAttachments.length ? (
                <div className="flex flex-wrap gap-2">
                  {pendingAttachments.map((attachment) => (
                    <span key={attachment.id} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs">
                      <Paperclip className="h-3 w-3" aria-hidden />
                      {attachment.name}
                    </span>
                  ))}
                </div>
              ) : null}
              <form className="flex gap-2" onSubmit={sendClientMessage}>
                <textarea
                  className="min-h-10 flex-1 rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Написать команде"
                  value={chatText}
                  onChange={(event) => setChatText(event.target.value)}
                />
                <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border bg-white px-3 text-sm font-medium hover:bg-neutral-50">
                  <Paperclip className="h-4 w-4" aria-hidden />
                  <input className="sr-only" multiple onChange={attachClientFiles} type="file" />
                </label>
                <Button size="icon" title="Отправить"><Send className="h-4 w-4" aria-hidden /></Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="block">
              <CardTitle className="text-lg">Документы</CardTitle>
              <p className="mt-1 text-sm text-neutral-500">Файлы, открытые для клиента.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between rounded-lg border p-4">
                  <span className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-amber-600" aria-hidden />
                    <span><strong className="block text-sm">{document.title}</strong><span className="text-xs text-neutral-500">{document.type}</span></span>
                  </span>
                  <Badge>{formatDate(document.uploadedAt)}</Badge>
                </div>
              ))}
              {!documents.length ? <p className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">Открытые документы появятся здесь.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="block">
              <CardTitle className="text-lg">Согласования</CardTitle>
              <p className="mt-1 text-sm text-neutral-500">Планировки, материалы, смета и этапы работ.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {approvals.map((approval) => (
                <div key={approval.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold">{approval.title}</p>
                      <p className="mt-1 text-sm text-neutral-500">Обновлено {formatDate(approval.updatedAt)}{approval.comment ? ` · ${approval.comment}` : ''}</p>
                    </div>
                    <ApprovalBadge status={approval.status} />
                  </div>
                  <form
                    className="mt-4 grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      updateApproval(approval, 'вопрос', question || 'Клиент задал вопрос.');
                    }}
                  >
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" type="button" onClick={() => updateApproval(approval, 'одобрено', 'Клиент одобрил.')}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        Одобрить
                      </Button>
                      <Button size="sm" variant="outline" type="button" onClick={() => updateApproval(approval, 'нужны правки', 'Нужны правки.')}>
                        Нужны правки
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        className="min-h-10 flex-1 rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        placeholder="Вопрос или комментарий"
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                      />
                      <Button size="icon" type="submit" title="Отправить вопрос"><Send className="h-4 w-4" aria-hidden /></Button>
                    </div>
                  </form>
                </div>
              ))}
              {!approvals.length ? <p className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">Согласования появятся здесь, когда команда откроет их клиенту.</p> : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function ClientStat({ icon: Icon, label, value }: { icon: typeof Home; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function ClientReportMedia({ media, title }: { media: RepairReportMedia; title: string }) {
  const src = useResolvedMediaUrl(media.url);

  if (media.type === 'video') {
    return (
      <div className="relative h-32 overflow-hidden rounded bg-neutral-950">
        {src ? <video className="h-full w-full object-cover" controls playsInline preload="metadata" src={src} title={media.name ?? title} /> : null}
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
          Видео{media.name ? ` · ${media.name}` : ''}
        </span>
      </div>
    );
  }

  return (
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={media.name ?? title} className="h-32 w-full rounded object-cover" />
    ) : (
      <div className="flex h-32 items-center justify-center rounded bg-neutral-100 text-xs text-neutral-500">Файл сохранен</div>
    )
  );
}

function ApprovalBadge({ status }: { status: RepairApproval['status'] }) {
  const tone = status === 'одобрено' ? 'green' : status === 'нужны правки' || status === 'вопрос' ? 'amber' : 'neutral';
  return <Badge tone={tone}>{status}</Badge>;
}
