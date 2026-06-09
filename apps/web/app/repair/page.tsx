'use client';

import Link from 'next/link';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FilePlus2,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  PackageCheck,
  PackagePlus,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Upload,
  UserCog,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Field, SelectInput, TextareaInput } from '@/components/forms/field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useCrmData } from '@/hooks/useCrmData';
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl';
import { useToast } from '@/hooks/useToast';
import { formatAmount } from '@/lib/i18n/format';
import { createEmptyRepairData } from '@/lib/mock-data/seed';
import { repairClientPath, repairLandingPath } from '@/lib/repair/platform';
import { isRepairPortalRole } from '@/lib/repair/roles';
import type {
  RepairChatAttachment,
  RepairClient,
  RepairData,
  RepairMaterialStatus,
  RepairPaymentStatus,
  RepairProject,
  RepairReportMedia,
  RepairStage,
  RepairTask,
} from '@/lib/storage/types';
import { saveMediaFile } from '@/lib/storage/media-store';

type ModuleId = 'overview' | 'projects' | 'clients' | 'schedule' | 'tasks' | 'team' | 'chat' | 'documents' | 'finance' | 'materials' | 'reports' | 'analytics';

const modules: { id: ModuleId; label: string; icon: LucideIcon; roles: string[] }[] = [
  { id: 'overview', label: 'Обзор', icon: LayoutDashboard, roles: ['owner', 'admin', 'manager', 'designer', 'foreman', 'worker'] },
  { id: 'projects', label: 'Проекты', icon: BriefcaseBusiness, roles: ['owner', 'admin', 'manager', 'designer', 'foreman', 'worker'] },
  { id: 'clients', label: 'Клиенты', icon: UserPlus, roles: ['owner', 'admin', 'manager'] },
  { id: 'schedule', label: 'Календарь работ', icon: CalendarDays, roles: ['owner', 'admin', 'manager', 'designer', 'foreman', 'worker'] },
  { id: 'tasks', label: 'Задачи', icon: ClipboardList, roles: ['owner', 'admin', 'manager', 'designer', 'foreman', 'worker'] },
  { id: 'team', label: 'Команда', icon: UserCog, roles: ['owner', 'admin', 'manager', 'foreman'] },
  { id: 'chat', label: 'Чаты проектов', icon: MessageCircle, roles: ['owner', 'admin', 'manager', 'designer', 'foreman', 'worker'] },
  { id: 'documents', label: 'Документы', icon: FileText, roles: ['owner', 'admin', 'manager', 'designer', 'foreman'] },
  { id: 'finance', label: 'Финансы', icon: CircleDollarSign, roles: ['owner', 'admin', 'manager'] },
  { id: 'materials', label: 'Материалы', icon: PackageCheck, roles: ['owner', 'admin', 'manager', 'foreman'] },
  { id: 'reports', label: 'Фотоотчеты', icon: ImagePlus, roles: ['owner', 'admin', 'manager', 'designer', 'foreman', 'worker'] },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3, roles: ['owner', 'admin', 'manager'] },
];

const materialStatuses: RepairMaterialStatus[] = ['нужно купить', 'заказано', 'доставлено', 'оплачено'];
const paymentStatuses: RepairPaymentStatus[] = ['ожидается', 'оплачено'];
const paymentTypes = ['предоплата', 'этап', 'финальный платеж'] as const;
const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function todayLabel() {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    owner: 'Директор',
    admin: 'Админ',
    manager: 'Менеджер',
    designer: 'Дизайнер',
    foreman: 'Прораб',
    worker: 'Рабочий',
  };
  return labels[role] ?? role;
}

function isOverdue(task: RepairTask) {
  return task.status !== 'завершена' && task.deadline < todayIso();
}

function monthCells(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const cell = new Date(start);
    cell.setDate(start.getDate() + index);
    return cell;
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function fillTemplate(body: string, values: Record<string, string>) {
  return Object.entries(values).reduce((text, [field, value]) => text.replaceAll(`{{${field}}}`, value || '—'), body);
}

export default function RepairWorkPortalPage() {
  const { company, currentUser, logout } = useAuth();
  const { repair, teamMembers, updateRepairData } = useCrmData();
  const { showToast } = useToast();
  const [active, setActive] = useState<ModuleId>('overview');
  const [projectQuery, setProjectQuery] = useState('');
  const [taskQuery, setTaskQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date());
  const [activeThreadId, setActiveThreadId] = useState('');
  const [chatText, setChatText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<RepairChatAttachment[]>([]);
  const [newChat, setNewChat] = useState({ title: '', projectId: '', memberIds: [] as string[] });
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '', whatsapp: '', password: '' });
  const [clientProjectForm, setClientProjectForm] = useState({ clientId: '', projectId: '' });
  const [documentForm, setDocumentForm] = useState({ templateId: '', projectId: '', stageId: '', values: {} as Record<string, string> });
  const [paymentForm, setPaymentForm] = useState({ projectId: '', amount: '', date: todayIso(), type: 'этап' as (typeof paymentTypes)[number], status: 'оплачено' as RepairPaymentStatus });
  const [materialForm, setMaterialForm] = useState({ projectId: '', title: '', category: '', quantity: '', price: '', supplier: '', status: 'нужно купить' as RepairMaterialStatus });
  const [reportForm, setReportForm] = useState({ projectId: '', stageId: '', title: '', description: '', mediaUrl: '', media: [] as RepairReportMedia[], visibleForClient: true });

  const data: RepairData = repair ?? createEmptyRepairData(company?.name);
  const currentRole = currentUser?.role ?? 'manager';
  const currentMember = teamMembers.find((member) => member.id === currentUser?.id);
  const visibleModules = modules.filter((module) => module.roles.includes(currentRole));
  const isLeader = ['owner', 'admin', 'manager'].includes(currentRole);
  const clientById = useMemo(() => new Map(data.clients.map((client) => [client.id, client])), [data.clients]);
  const teamById = useMemo(() => new Map(teamMembers.map((member) => [member.id, member])), [teamMembers]);

  const projectsForRole = useMemo(() => {
    if (!currentUser || isLeader) return data.projects;
    if (currentRole === 'designer') return data.projects.filter((project) => project.designerId === currentUser.id);
    if (currentRole === 'foreman') return data.projects.filter((project) => project.foremanId === currentUser.id);
    if (currentRole === 'worker') {
      const ids = new Set(data.tasks.filter((task) => task.assigneeId === currentUser.id).map((task) => task.projectId));
      return data.projects.filter((project) => ids.has(project.id));
    }
    return data.projects;
  }, [currentRole, currentUser, data.projects, data.tasks, isLeader]);

  const selectedProject = useMemo(
    () => projectsForRole.find((project) => project.id === selectedProjectId) ?? projectsForRole[0],
    [projectsForRole, selectedProjectId],
  );
  const defaultProjectId = selectedProject?.id ?? projectsForRole[0]?.id ?? '';
  const visibleProjectIds = useMemo(() => new Set(projectsForRole.map((project) => project.id)), [projectsForRole]);
  const visibleTasks = data.tasks.filter((task) => visibleProjectIds.has(task.projectId));
  const filteredProjects = projectsForRole.filter((project) => {
    const client = clientById.get(project.clientId);
    return `${project.title} ${client?.name ?? ''} ${project.address} ${project.city}`.toLowerCase().includes(projectQuery.toLowerCase());
  });
  const filteredTasks = visibleTasks.filter((task) => `${task.title} ${task.description} ${task.trade} ${task.location}`.toLowerCase().includes(taskQuery.toLowerCase()));
  const projectStages = data.stages.filter((stage) => stage.projectId === selectedProject?.id);
  const projectTasks = data.tasks.filter((task) => task.projectId === selectedProject?.id);
  const projectPayments = data.payments.filter((payment) => payment.projectId === selectedProject?.id);
  const projectMaterials = data.materials.filter((material) => material.projectId === selectedProject?.id);
  const projectReports = data.photoReports.filter((report) => report.projectId === selectedProject?.id);

  const visibleThreads = data.chatThreads.filter((thread) => {
    if (!visibleProjectIds.has(thread.projectId)) return false;
    if (isLeader) return true;
    return currentUser ? thread.memberIds.includes(currentUser.id) : false;
  });
  const activeThread = visibleThreads.find((thread) => thread.id === activeThreadId) ?? visibleThreads[0];
  const threadMessages = activeThread
    ? data.chatMessages.filter((message) => (message.threadId ? message.threadId === activeThread.id : message.projectId === activeThread.projectId))
    : [];

  const activeProjects = projectsForRole.filter((project) => project.status !== 'завершен').length;
  const worksToday = visibleTasks.filter((task) => task.deadline <= todayIso() && task.status !== 'завершена').length;
  const overdue = visibleTasks.filter(isOverdue).length;
  const turnover = projectsForRole.reduce((sum, project) => sum + project.budget, 0);
  const paid = projectsForRole.reduce((sum, project) => sum + project.paid, 0);
  const pendingPayments = data.payments.filter((payment) => payment.status === 'ожидается').reduce((sum, payment) => sum + payment.amount, 0);
  const materialCost = data.materials.reduce((sum, material) => sum + material.price, 0);
  const averageProgress = Math.round(projectsForRole.reduce((sum, project) => sum + project.progress, 0) / Math.max(projectsForRole.length, 1));

  function openProject(projectId: string, nextModule: ModuleId = 'projects') {
    setSelectedProjectId(projectId);
    setActive(nextModule);
  }

  function goToReports(projectId: string, stageId: string, title: string) {
    setReportForm((current) => ({
      ...current,
      projectId,
      stageId,
      title: current.title || `Фотоотчет: ${title}`,
    }));
    setSelectedProjectId(projectId);
    setActive('reports');
  }

  function completeStage(stage: RepairStage) {
    const hasReport = data.photoReports.some((report) => report.stageId === stage.id);
    if (!hasReport) {
      showToast('Сначала добавьте фотоотчет по этапу, потом его можно закрыть.', 'danger');
      goToReports(stage.projectId, stage.id, stage.title);
      return;
    }

    updateRepairData((current) => {
      const stages = current.stages.map((item) => (item.id === stage.id ? { ...item, status: 'завершен' as const, progress: 100 } : item));
      const projectStagesAfter = stages.filter((item) => item.projectId === stage.projectId);
      const progress = Math.round(projectStagesAfter.reduce((sum, item) => sum + item.progress, 0) / Math.max(projectStagesAfter.length, 1));
      return {
        ...current,
        stages,
        tasks: current.tasks.map((task) => (task.stageId === stage.id ? { ...task, status: 'завершена' as const } : task)),
        projects: current.projects.map((project) =>
          project.id === stage.projectId
            ? { ...project, progress, status: progress >= 100 ? ('завершен' as const) : project.status }
            : project,
        ),
      };
    });
    showToast('Этап закрыт, прогресс проекта обновлен');
  }

  function completeTask(task: RepairTask) {
    const hasReport = data.photoReports.some((report) => report.stageId === task.stageId);
    if (!hasReport) {
      showToast('Для закрытия задачи нужен фотоотчет по этапу.', 'danger');
      goToReports(task.projectId, task.stageId, task.title);
      return;
    }

    updateRepairData((current) => ({
      ...current,
      tasks: current.tasks.map((item) => (item.id === task.id ? { ...item, status: 'завершена' as const } : item)),
    }));
    showToast('Задача закрыта');
  }

  async function attachFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const attachments = await Promise.all(
      files.slice(0, 6).map(async (file) => ({
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

  async function attachReportMedia(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const media = await Promise.all(
      files.slice(0, 12).map(async (file) => {
        let url: string;
        try {
          url = await saveMediaFile(file);
        } catch {
          url = await readFileAsDataUrl(file);
        }

        return {
          id: crypto.randomUUID(),
          type: file.type.startsWith('video/') ? ('video' as const) : ('image' as const),
          url,
          name: file.name,
        };
      }),
    );
    setReportForm((current) => ({ ...current, media: [...current.media, ...media] }));
    event.target.value = '';
  }

  function removeReportMedia(id: string) {
    setReportForm((current) => ({ ...current, media: current.media.filter((item) => item.id !== id) }));
  }

  function createChatThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const projectId = newChat.projectId || defaultProjectId;
    if (!currentUser || !projectId || !newChat.title.trim()) return;
    const memberIds = Array.from(new Set([currentUser.id, ...newChat.memberIds]));
    const thread = {
      id: crypto.randomUUID(),
      projectId,
      title: newChat.title.trim(),
      memberIds,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    updateRepairData((current) => ({ ...current, chatThreads: [...current.chatThreads, thread] }));
    setActiveThreadId(thread.id);
    setNewChat({ title: '', projectId, memberIds: [] });
    showToast('Чат создан');
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !activeThread) return;
    if (!chatText.trim() && !pendingAttachments.length) return;
    updateRepairData((current) => ({
      ...current,
      chatMessages: [
        ...current.chatMessages,
        {
          id: crypto.randomUUID(),
          projectId: activeThread.projectId,
          threadId: activeThread.id,
          authorId: currentUser.id,
          authorName: currentUser.name,
          body: chatText.trim(),
          attachments: pendingAttachments,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setChatText('');
    setPendingAttachments([]);
  }

  function createClientAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = clientForm.name.trim();
    const phone = clientForm.phone.trim();
    const email = clientForm.email.trim().toLowerCase();
    const password = clientForm.password.trim();
    if (!name || !phone || !email || !password) {
      showToast('Укажите имя, телефон, почту и пароль клиента.', 'danger');
      return;
    }
    if (password.length < 4) {
      showToast('Пароль клиента должен быть минимум 4 символа.', 'danger');
      return;
    }

    const duplicate = data.clients.some(
      (client) => client.email.trim().toLowerCase() === email || normalizePhone(client.phone) === normalizePhone(phone),
    );
    if (duplicate) {
      showToast('Клиент с такой почтой или телефоном уже есть.', 'danger');
      return;
    }

    const client: RepairClient = {
      id: crypto.randomUUID(),
      name,
      phone,
      whatsapp: clientForm.whatsapp.trim() || phone,
      email,
      password,
    };

    updateRepairData((current) => ({ ...current, clients: [client, ...current.clients] }));
    setClientForm({ name: '', phone: '', email: '', whatsapp: '', password: '' });
    setClientProjectForm((current) => ({ ...current, clientId: client.id }));
    showToast('Клиентский аккаунт создан');
  }

  function assignProjectToClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clientId = clientProjectForm.clientId || data.clients[0]?.id;
    const projectId = clientProjectForm.projectId || projectsForRole[0]?.id;
    if (!clientId || !projectId) return;

    updateRepairData((current) => ({
      ...current,
      projects: current.projects.map((project) => (project.id === projectId ? { ...project, clientId } : project)),
    }));
    setClientProjectForm({ clientId, projectId });
    showToast('Проект привязан к клиенту');
  }

  function createDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const template = data.documentTemplates.find((item) => item.id === documentForm.templateId) ?? data.documentTemplates[0];
    const projectId = documentForm.projectId || defaultProjectId;
    const project = data.projects.find((item) => item.id === projectId);
    if (!template || !project) return;

    updateRepairData((current) => ({
      ...current,
      documents: [
        ...current.documents,
        {
          id: crypto.randomUUID(),
          projectId,
          stageId: documentForm.stageId || undefined,
          title: `${template.title}: ${project.title}`,
          type: template.type,
          visibleForClient: true,
          uploadedAt: todayIso(),
          content: fillTemplate(template.body, documentForm.values),
        },
      ],
    }));
    setDocumentForm({ templateId: template.id, projectId, stageId: '', values: {} });
    showToast('Документ создан из шаблона');
  }

  function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const projectId = paymentForm.projectId || defaultProjectId;
    const amount = Number(paymentForm.amount);
    if (!projectId || !Number.isFinite(amount) || amount <= 0) return;

    updateRepairData((current) => ({
      ...current,
      payments: [
        ...current.payments,
        {
          id: crypto.randomUUID(),
          projectId,
          amount,
          date: paymentForm.date || todayIso(),
          type: paymentForm.type,
          status: paymentForm.status,
        },
      ],
      projects: current.projects.map((project) =>
        project.id === projectId && paymentForm.status === 'оплачено'
          ? { ...project, paid: Math.min(project.budget, project.paid + amount) }
          : project,
      ),
    }));
    setPaymentForm({ projectId, amount: '', date: todayIso(), type: 'этап', status: 'оплачено' });
    showToast('Платеж добавлен');
  }

  function createMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const projectId = materialForm.projectId || defaultProjectId;
    const price = Number(materialForm.price);
    if (!projectId || !materialForm.title.trim() || !materialForm.quantity.trim()) return;

    updateRepairData((current) => ({
      ...current,
      materials: [
        ...current.materials,
        {
          id: crypto.randomUUID(),
          projectId,
          title: materialForm.title.trim(),
          category: materialForm.category.trim() || 'материалы',
          quantity: materialForm.quantity.trim(),
          price: Number.isFinite(price) ? price : 0,
          supplier: materialForm.supplier.trim() || 'не указан',
          status: materialForm.status,
        },
      ],
    }));
    setMaterialForm({ projectId, title: '', category: '', quantity: '', price: '', supplier: '', status: 'нужно купить' });
    showToast('Материал добавлен');
  }

  function updateMaterialStatus(id: string, status: RepairMaterialStatus) {
    updateRepairData((current) => ({
      ...current,
      materials: current.materials.map((material) => (material.id === id ? { ...material, status } : material)),
    }));
  }

  function createPhotoReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const projectId = reportForm.projectId || defaultProjectId;
    const stageId = reportForm.stageId || data.stages.find((stage) => stage.projectId === projectId)?.id;
    if (!projectId || !stageId || !reportForm.title.trim()) return;
    const linkedMedia = reportForm.mediaUrl.trim()
      ? [
          {
            id: crypto.randomUUID(),
            type: /\.(mp4|webm|mov|m4v)(\?|$)/i.test(reportForm.mediaUrl.trim()) ? ('video' as const) : ('image' as const),
            url: reportForm.mediaUrl.trim(),
            name: 'Ссылка',
          },
        ]
      : [];
    const media = [...reportForm.media, ...linkedMedia];
    if (!media.length) {
      showToast('Добавьте хотя бы одно фото или видео для фотоотчета.', 'danger');
      return;
    }
    updateRepairData((current) => ({
      ...current,
      photoReports: [
        ...current.photoReports,
        {
          id: crypto.randomUUID(),
          projectId,
          stageId,
          title: reportForm.title.trim(),
          imageUrl: media.find((item) => item.type === 'image')?.url ?? media[0]?.url,
          media,
          date: todayIso(),
          description: reportForm.description.trim() || 'Фотофиксация выполненных работ.',
          visibleForClient: reportForm.visibleForClient,
        },
      ],
    }));
    setReportForm({ projectId, stageId, title: '', description: '', mediaUrl: '', media: [], visibleForClient: true });
    showToast('Фотоотчет добавлен');
  }

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f1e8] p-4">
        <Card className="max-w-md p-6 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-neutral-500" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold">Вход в ремонтный портал</h1>
          <p className="mt-2 text-sm text-neutral-500">Рабочий сайт доступен сотрудникам ремонтной компании.</p>
          <Button asChild className="mt-5">
            <Link href="/login?next=/repair">Войти</Link>
          </Button>
        </Card>
      </main>
    );
  }

  if (company?.vertical !== 'repair') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f1e8] p-4">
        <Card className="max-w-md p-6 text-center">
          <h1 className="text-2xl font-semibold">Ремонтный портал недоступен</h1>
          <p className="mt-2 text-sm text-neutral-500">Он создается только для компаний с профилем “Ремонтная компания”.</p>
          <Button asChild className="mt-5">
            <Link href="/dashboard">Вернуться в CRM</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-neutral-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center justify-between px-5">
          <Link href={repairLandingPath(data.site.username)} className="text-2xl font-semibold">{data.site.brandName}</Link>
          <Button size="icon" variant="ghost" onClick={logout} title="Выйти">
            <LogOut className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="mx-5 rounded-lg bg-neutral-950 p-4 text-white">
          <Badge className="bg-[#f2df9b] text-neutral-950">{roleLabel(currentRole)}</Badge>
          <p className="mt-4 text-lg font-semibold">{currentUser.name}</p>
          <p className="text-sm text-white/64">{currentMember?.role ? roleLabel(currentMember.role) : roleLabel(currentRole)}</p>
        </div>
        <nav className="mt-5 flex-1 space-y-1 px-4">
          {visibleModules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition ${active === module.id ? 'bg-[#fbf1cf] text-neutral-950' : 'text-neutral-700 hover:bg-neutral-100'}`}
                onClick={() => setActive(module.id)}
                type="button"
              >
                <Icon className="h-4 w-4" aria-hidden />
                {module.label}
              </button>
            );
          })}
        </nav>
        {!isRepairPortalRole(currentRole) ? (
          <div className="space-y-2 border-t p-4">
            <Button asChild variant="outline" className="w-full">
              <Link href={repairLandingPath(data.site.username)}>Лендинг</Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="/dashboard">Khaman CRM</Link>
            </Button>
          </div>
        ) : null}
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b bg-[#f5f1e8]/95 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-neutral-500">Сегодня: {todayLabel()}</p>
              <h1 className="text-3xl font-semibold md:text-4xl">{modules.find((module) => module.id === active)?.label ?? 'Обзор'}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={repairClientPath(data.site.username)}>Кабинет клиента</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={repairLandingPath(data.site.username)}>Лендинг</Link>
              </Button>
              {!isRepairPortalRole(currentRole) ? (
                <Button asChild>
                  <Link href="/dashboard">CRM с лидами</Link>
                </Button>
              ) : null}
            </div>
	            </div>
	          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Модули ремонтного портала">
	            {visibleModules.map((module) => {
	              const Icon = module.icon;
	              return (
	                <button
	                  key={module.id}
	                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${active === module.id ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-700'}`}
	                  onClick={() => setActive(module.id)}
	                  type="button"
	                >
	                  <Icon className="h-4 w-4" aria-hidden />
	                  {module.label}
	                </button>
	              );
	            })}
	          </nav>
	        </header>

        <section className="px-4 py-6 md:px-8">
          {active === 'overview' ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <PortalMetric title="Активные проекты" value={activeProjects} icon={BriefcaseBusiness} />
                <PortalMetric title="Работы сегодня" value={worksToday} icon={CalendarDays} />
                <PortalMetric title="Просрочено" value={overdue} icon={ClipboardList} danger={overdue > 0} />
                <PortalMetric title="Оборот" value={formatAmount(turnover)} icon={CircleDollarSign} />
              </div>
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card>
                  <CardHeader className="block">
                    <CardTitle className="text-xl">Проекты</CardTitle>
                    <p className="mt-1 text-sm text-neutral-500">Откройте объект, чтобы управлять этапами, задачами, чатом, документами и фотоотчетами.</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {filteredProjects.map((project) => (
                      <ProjectButton key={project.id} project={project} clientName={clientById.get(project.clientId)?.name} selected={selectedProject?.id === project.id} onClick={() => openProject(project.id)} />
                    ))}
                    {!filteredProjects.length ? <p className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">Нет проектов для вашей роли.</p> : null}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-xl">Сегодня и завтра</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {visibleTasks.slice(0, 5).map((task) => (
                      <TaskLine key={task.id} task={task} project={data.projects.find((project) => project.id === task.projectId)} assignee={teamById.get(task.assigneeId)?.name} onDone={() => completeTask(task)} />
                    ))}
                    {!visibleTasks.length ? <p className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">Задач пока нет.</p> : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {active === 'projects' ? (
            <Card>
              <CardHeader className="block">
                <CardTitle className="text-xl">Проекты</CardTitle>
                <div className="relative mt-4 max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
                  <Input className="pl-9" placeholder="Поиск объекта" value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3">
                  {filteredProjects.map((project) => (
                    <ProjectButton key={project.id} project={project} clientName={clientById.get(project.clientId)?.name} selected={selectedProject?.id === project.id} onClick={() => openProject(project.id)} />
                  ))}
                </div>
                {selectedProject ? (
                  <ProjectDetails
                    project={selectedProject}
                    stages={projectStages}
                    tasks={projectTasks}
                    payments={projectPayments}
                    materials={projectMaterials}
                    reports={projectReports}
                    teamById={teamById}
                    onCompleteStage={completeStage}
                    onCompleteTask={completeTask}
                    onAddReport={goToReports}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {active === 'clients' ? (
            <ClientsPanel
              clients={data.clients}
              projects={projectsForRole}
              clientById={clientById}
              clientForm={clientForm}
              clientProjectForm={clientProjectForm}
              landingUsername={data.site.username}
              onClientFormChange={setClientForm}
              onClientProjectFormChange={setClientProjectForm}
              onClientSubmit={createClientAccount}
              onAssignSubmit={assignProjectToClient}
              onOpenProject={openProject}
            />
          ) : null}

          {active === 'schedule' ? (
            <CalendarPanel
              anchor={calendarAnchor}
              tasks={visibleTasks}
              stages={data.stages.filter((stage) => visibleProjectIds.has(stage.projectId))}
              projects={data.projects}
              teamById={teamById}
              onMonthChange={setCalendarAnchor}
              onOpenProject={openProject}
            />
          ) : null}

          {active === 'tasks' ? (
            <SimplePanel title="Задачи">
              <div className="relative mb-4 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
                <Input className="pl-9" placeholder="Поиск задачи" value={taskQuery} onChange={(event) => setTaskQuery(event.target.value)} />
              </div>
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <TaskLine key={task.id} task={task} project={data.projects.find((project) => project.id === task.projectId)} assignee={teamById.get(task.assigneeId)?.name} onDone={() => completeTask(task)} />
                ))}
                {!filteredTasks.length ? <p className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500">Ничего не найдено.</p> : null}
              </div>
            </SimplePanel>
          ) : null}

          {active === 'team' ? (
            <SimplePanel title="Команда">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="rounded-lg border bg-white p-4">
                    <p className="font-semibold">{member.name}</p>
                    <p className="mt-1 text-sm text-neutral-500">{member.email}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge>{roleLabel(member.role)}</Badge>
                      <Badge tone={member.status === 'active' ? 'green' : 'neutral'}>{member.status === 'active' ? 'активен' : 'неактивен'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </SimplePanel>
          ) : null}

          {active === 'chat' ? (
            <SimplePanel title="Чаты проектов">
              <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
                <div className="space-y-4">
                  <form className="space-y-3 rounded-lg border bg-white p-4" onSubmit={createChatThread}>
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" aria-hidden />
                      <p className="font-semibold">Новый чат</p>
                    </div>
                    <Input placeholder="Название чата" value={newChat.title} onChange={(event) => setNewChat({ ...newChat, title: event.target.value })} />
                    <SelectInput value={newChat.projectId || defaultProjectId} onChange={(event) => setNewChat({ ...newChat, projectId: event.target.value })}>
                      {projectsForRole.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                    </SelectInput>
                    <div className="max-h-36 space-y-2 overflow-auto rounded-md bg-neutral-50 p-2">
                      {teamMembers.map((member) => (
                        <label key={member.id} className="flex items-center gap-2 text-sm">
                          <input
                            checked={newChat.memberIds.includes(member.id)}
                            onChange={(event) => {
                              setNewChat((current) => ({
                                ...current,
                                memberIds: event.target.checked
                                  ? [...current.memberIds, member.id]
                                  : current.memberIds.filter((id) => id !== member.id),
                              }));
                            }}
                            type="checkbox"
                          />
                          {member.name} · {roleLabel(member.role)}
                        </label>
                      ))}
                    </div>
                    <Button type="submit" className="w-full">
                      <Users className="h-4 w-4" aria-hidden />
                      Создать чат
                    </Button>
                  </form>

                  <div className="space-y-2">
                    {visibleThreads.map((thread) => (
                      <button
                        key={thread.id}
                        className={`w-full rounded-lg border p-3 text-left ${activeThread?.id === thread.id ? 'border-neutral-950 bg-neutral-50' : 'bg-white'}`}
                        onClick={() => {
                          setActiveThreadId(thread.id);
                          setSelectedProjectId(thread.projectId);
                        }}
                        type="button"
                      >
                        <p className="font-semibold">{thread.title}</p>
                        <p className="text-xs text-neutral-500">{data.projects.find((project) => project.id === thread.projectId)?.title ?? 'Проект'} · {thread.memberIds.length} участников</p>
                      </button>
                    ))}
                    {!visibleThreads.length ? <p className="rounded-lg bg-white p-4 text-sm text-neutral-500">Создайте первый чат для проекта.</p> : null}
                  </div>
                </div>

                <div className="rounded-lg border bg-white">
                  <div className="border-b p-4">
                    <p className="font-semibold">{activeThread?.title ?? 'Чат не выбран'}</p>
                    {activeThread ? <p className="text-xs text-neutral-500">{activeThread.memberIds.map((id) => teamById.get(id)?.name).filter(Boolean).join(', ')}</p> : null}
                  </div>
                  <div className="max-h-[460px] space-y-3 overflow-auto p-4">
                    {threadMessages.map((message) => (
                      <ChatBubble key={message.id} message={message} own={message.authorId === currentUser.id} />
                    ))}
                    {!threadMessages.length ? <p className="text-sm text-neutral-500">Сообщений пока нет.</p> : null}
                  </div>
                  {pendingAttachments.length ? (
                    <div className="flex flex-wrap gap-2 border-t px-3 py-2">
                      {pendingAttachments.map((attachment) => (
                        <span key={attachment.id} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs">
                          <Paperclip className="h-3 w-3" aria-hidden />
                          {attachment.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <form className="flex flex-col gap-2 border-t p-3 sm:flex-row" onSubmit={sendMessage}>
                    <Input placeholder="Написать в чат проекта" value={chatText} onChange={(event) => setChatText(event.target.value)} />
                    <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border bg-white px-3 text-sm font-medium hover:bg-neutral-50">
                      <Paperclip className="h-4 w-4" aria-hidden />
                      <input className="sr-only" multiple onChange={attachFiles} type="file" />
                    </label>
                    <Button size="icon" title="Отправить" disabled={!activeThread}>
                      <Send className="h-4 w-4" aria-hidden />
                    </Button>
                  </form>
                </div>
              </div>
            </SimplePanel>
          ) : null}

          {active === 'documents' ? (
            <DocumentsPanel
              data={data}
              selectedProjectId={defaultProjectId}
              form={documentForm}
              onFormChange={setDocumentForm}
              onSubmit={createDocument}
            />
          ) : null}

          {active === 'finance' ? (
            <FinancePanel
              projects={projectsForRole}
              payments={data.payments}
              form={paymentForm}
              onFormChange={setPaymentForm}
              onSubmit={createPayment}
              pendingPayments={pendingPayments}
              totalBudget={turnover}
              paid={paid}
            />
          ) : null}

          {active === 'materials' ? (
            <MaterialsPanel
              projects={projectsForRole}
              materials={data.materials.filter((material) => visibleProjectIds.has(material.projectId))}
              form={materialForm}
              onFormChange={setMaterialForm}
              onSubmit={createMaterial}
              onStatusChange={updateMaterialStatus}
              totalCost={materialCost}
            />
          ) : null}

          {active === 'reports' ? (
            <ReportsPanel
              projects={projectsForRole}
              stages={data.stages.filter((stage) => visibleProjectIds.has(stage.projectId))}
              reports={data.photoReports.filter((report) => visibleProjectIds.has(report.projectId))}
              form={reportForm}
              onFormChange={setReportForm}
              onFileChange={attachReportMedia}
              onMediaRemove={removeReportMedia}
              onSubmit={createPhotoReport}
            />
          ) : null}

          {active === 'analytics' ? (
            <AnalyticsPanel
              projects={projectsForRole}
              tasks={visibleTasks}
              materials={data.materials.filter((material) => visibleProjectIds.has(material.projectId))}
              teamById={teamById}
              averageProgress={averageProgress}
              paid={paid}
              receivable={Math.max(0, turnover - paid)}
              overdue={overdue}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function PortalMetric({ title, value, icon: Icon, danger }: { title: string; value: string | number; icon: LucideIcon; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-500">{title}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
          <span className={`flex h-10 w-10 items-center justify-center rounded-md ${danger ? 'bg-rose-50 text-rose-700' : 'bg-[#fbf1cf] text-neutral-900'}`}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectButton({ project, clientName, selected, onClick }: { project: RepairProject; clientName?: string; selected?: boolean; onClick: () => void }) {
  return (
    <button className={`w-full rounded-lg border bg-white p-4 text-left transition hover:border-neutral-400 ${selected ? 'border-neutral-950' : ''}`} onClick={onClick} type="button">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{project.title}</p>
          <p className="mt-1 text-sm text-neutral-500">{clientName ?? 'Клиент'} · сдача {formatDate(project.dueDate)}</p>
        </div>
        <Badge tone={project.status === 'завершен' ? 'green' : 'amber'}>{project.progress}%</Badge>
      </div>
      <Progress value={project.progress} className="mt-4 bg-neutral-200" barClassName="bg-[#caa146]" />
    </button>
  );
}

function TaskLine({ task, project, assignee, onDone }: { task: RepairTask; project?: RepairProject; assignee?: string; onDone?: () => void }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-semibold">{task.title}</p>
          <p className="mt-1 text-sm text-neutral-500">{project?.title ?? 'Проект'} · {task.location} · {assignee ?? 'исполнитель'}</p>
        </div>
        <Badge tone={isOverdue(task) ? 'rose' : task.status === 'завершена' ? 'green' : 'neutral'}>{task.status}</Badge>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-neutral-500">Дедлайн: {formatDate(task.deadline)} · {task.trade}</p>
        {task.status !== 'завершена' && onDone ? (
          <Button size="sm" variant="outline" type="button" onClick={onDone}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Закрыть
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ProjectDetails({
  project,
  stages,
  tasks,
  payments,
  materials,
  reports,
  teamById,
  onCompleteStage,
  onCompleteTask,
  onAddReport,
}: {
  project: RepairProject;
  stages: RepairData['stages'];
  tasks: RepairTask[];
  payments: RepairData['payments'];
  materials: RepairData['materials'];
  reports: RepairData['photoReports'];
  teamById: Map<string, { name: string }>;
  onCompleteStage: (stage: RepairStage) => void;
  onCompleteTask: (task: RepairTask) => void;
  onAddReport: (projectId: string, stageId: string, title: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border bg-white p-4">
      <div>
        <h2 className="text-2xl font-semibold">{project.title}</h2>
        <p className="mt-1 text-sm text-neutral-500">{project.address} · {project.area} м² · {project.service}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MiniStat title="Бюджет" value={formatAmount(project.budget)} />
        <MiniStat title="Оплачено" value={formatAmount(project.paid)} />
        <MiniStat title="Прогресс" value={`${project.progress}%`} />
      </div>
      <div className="space-y-3">
        <p className="text-sm font-semibold">Этапы с обязательным фотоотчетом</p>
        {stages.map((stage) => {
          const hasReport = reports.some((report) => report.stageId === stage.id);
          return (
            <div key={stage.id} className="rounded-lg border bg-neutral-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-semibold">{stage.title}</p>
                  <p className="mt-1 text-sm text-neutral-500">{stage.description}</p>
                  <p className="mt-2 text-xs text-neutral-500">Ответственный: {teamById.get(stage.responsibleId)?.name ?? 'команда'} · дедлайн {formatDate(stage.deadline)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={stage.status === 'завершен' ? 'green' : hasReport ? 'amber' : 'rose'}>
                    {hasReport ? 'фото есть' : 'нужен фотоотчет'}
                  </Badge>
                  {stage.status !== 'завершен' ? (
                    <>
                      <Button size="sm" variant="outline" type="button" onClick={() => onAddReport(stage.projectId, stage.id, stage.title)}>
                        <Camera className="h-4 w-4" aria-hidden />
                        Фотоотчет
                      </Button>
                      <Button size="sm" type="button" onClick={() => onCompleteStage(stage)}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        Закрыть этап
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              <Progress value={stage.progress} className="mt-4 bg-neutral-200" barClassName="bg-[#caa146]" />
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold">Задачи</p>
          <div className="space-y-2">{tasks.map((task) => <TaskLine key={task.id} task={task} assignee={teamById.get(task.assigneeId)?.name} onDone={() => onCompleteTask(task)} />)}</div>
        </div>
        <div className="grid gap-3 content-start">
          <MiniStat title="Материалы" value={`${materials.length} позиций`} />
          <MiniStat title="Платежи" value={`${payments.length} записей`} />
          <MiniStat title="Фотоотчеты" value={`${reports.length} отчетов`} />
        </div>
      </div>
    </div>
  );
}

function CalendarPanel({
  anchor,
  tasks,
  stages,
  projects,
  teamById,
  onMonthChange,
  onOpenProject,
}: {
  anchor: Date;
  tasks: RepairTask[];
  stages: RepairStage[];
  projects: RepairProject[];
  teamById: Map<string, { name: string }>;
  onMonthChange: (date: Date) => void;
  onOpenProject: (projectId: string, module?: ModuleId) => void;
}) {
  const cells = monthCells(anchor);
  const title = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(anchor);
  const taskByDate = new Map<string, RepairTask[]>();
  const stagesByDate = new Map<string, RepairStage[]>();
  tasks.forEach((task) => taskByDate.set(task.deadline, [...(taskByDate.get(task.deadline) ?? []), task]));
  stages.forEach((stage) => stagesByDate.set(stage.deadline, [...(stagesByDate.get(stage.deadline) ?? []), stage]));

  function shiftMonth(value: number) {
    onMonthChange(new Date(anchor.getFullYear(), anchor.getMonth() + value, 1));
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle className="text-xl capitalize">{title}</CardTitle>
        <div className="flex gap-2">
          <Button size="icon" variant="outline" type="button" onClick={() => shiftMonth(-1)} title="Предыдущий месяц">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="outline" type="button" onClick={() => onMonthChange(new Date())}>Сегодня</Button>
          <Button size="icon" variant="outline" type="button" onClick={() => shiftMonth(1)} title="Следующий месяц">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 overflow-hidden rounded-lg border bg-white">
          {weekdays.map((day) => <div key={day} className="border-b bg-neutral-50 p-2 text-center text-xs font-semibold text-neutral-500">{day}</div>)}
          {cells.map((cell) => {
            const date = isoDate(cell);
            const dayTasks = taskByDate.get(date) ?? [];
            const dayStages = stagesByDate.get(date) ?? [];
            const muted = cell.getMonth() !== anchor.getMonth();
            return (
              <div key={date} className={`min-h-36 border-b border-r p-2 ${muted ? 'bg-neutral-50 text-neutral-400' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${date === todayIso() ? 'bg-neutral-950 text-white' : ''}`}>{cell.getDate()}</span>
                  {dayTasks.length + dayStages.length ? <Badge tone="amber">{dayTasks.length + dayStages.length}</Badge> : null}
                </div>
                <div className="mt-2 space-y-1">
                  {dayStages.slice(0, 2).map((stage) => (
                    <button key={stage.id} className="block w-full rounded bg-amber-50 px-2 py-1 text-left text-[11px] font-medium text-amber-900" type="button" onClick={() => onOpenProject(stage.projectId, 'projects')}>
                      Этап: {stage.title}
                    </button>
                  ))}
                  {dayTasks.slice(0, 3).map((task) => (
                    <button key={task.id} className="block w-full rounded bg-neutral-100 px-2 py-1 text-left text-[11px] text-neutral-700" type="button" onClick={() => onOpenProject(task.projectId, 'tasks')}>
                      {projects.find((project) => project.id === task.projectId)?.title}: {task.title}
                      <span className="block text-neutral-500">{teamById.get(task.assigneeId)?.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ChatBubble({ message, own }: { message: RepairData['chatMessages'][number]; own: boolean }) {
  return (
    <div className={`max-w-xl rounded-lg p-3 ${own ? 'ml-auto bg-neutral-950 text-white' : 'bg-neutral-100'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs opacity-70">{message.authorName}</p>
        <p className="text-[11px] opacity-60">{formatDateTime(message.createdAt)}</p>
      </div>
      {message.body ? <p className="mt-1 text-sm">{message.body}</p> : null}
      {message.attachments?.length ? (
        <div className="mt-3 grid gap-2">
          {message.attachments.map((attachment) => (
            <a key={attachment.id} className={`rounded-md border px-3 py-2 text-xs ${own ? 'border-white/20 bg-white/10 text-white' : 'bg-white text-neutral-700'}`} href={attachment.url} target="_blank" rel="noreferrer">
              {attachment.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={attachment.url} alt={attachment.name} className="mb-2 max-h-40 rounded object-cover" />
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
  );
}

function ClientsPanel({
  clients,
  projects,
  clientById,
  clientForm,
  clientProjectForm,
  landingUsername,
  onClientFormChange,
  onClientProjectFormChange,
  onClientSubmit,
  onAssignSubmit,
  onOpenProject,
}: {
  clients: RepairClient[];
  projects: RepairProject[];
  clientById: Map<string, RepairClient>;
  clientForm: { name: string; phone: string; email: string; whatsapp: string; password: string };
  clientProjectForm: { clientId: string; projectId: string };
  landingUsername: string;
  onClientFormChange: (form: { name: string; phone: string; email: string; whatsapp: string; password: string }) => void;
  onClientProjectFormChange: (form: { clientId: string; projectId: string }) => void;
  onClientSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAssignSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenProject: (projectId: string, module?: ModuleId) => void;
}) {
  const clientPath = repairClientPath(landingUsername);
  const selectedClientId = clientProjectForm.clientId || clients[0]?.id || '';
  const selectedProjectId = clientProjectForm.projectId || projects[0]?.id || '';

  return (
    <SimplePanel title="Клиенты и доступы">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <form className="grid gap-3 rounded-lg border bg-white p-4" onSubmit={onClientSubmit}>
            <div>
              <p className="font-semibold">Создать клиентский аккаунт</p>
              <p className="mt-1 text-sm text-neutral-500">Клиент входит с лендинга: в одну ячейку пишет почту или телефон, затем пароль.</p>
            </div>
            <Input placeholder="Имя клиента" value={clientForm.name} onChange={(event) => onClientFormChange({ ...clientForm, name: event.target.value })} />
            <Input placeholder="Телефон" value={clientForm.phone} onChange={(event) => onClientFormChange({ ...clientForm, phone: event.target.value })} />
            <Input placeholder="Почта" type="email" value={clientForm.email} onChange={(event) => onClientFormChange({ ...clientForm, email: event.target.value })} />
            <Input placeholder="Пароль для клиента" value={clientForm.password} onChange={(event) => onClientFormChange({ ...clientForm, password: event.target.value })} />
            <Input placeholder="WhatsApp, если отличается" value={clientForm.whatsapp} onChange={(event) => onClientFormChange({ ...clientForm, whatsapp: event.target.value })} />
            <Button type="submit">
              <UserPlus className="h-4 w-4" aria-hidden />
              Создать клиента
            </Button>
          </form>

          <form className="grid gap-3 rounded-lg border bg-white p-4" onSubmit={onAssignSubmit}>
            <div>
              <p className="font-semibold">Привязать проект к клиенту</p>
              <p className="mt-1 text-sm text-neutral-500">После привязки объект появится в личном кабинете этого клиента.</p>
            </div>
            <SelectInput value={selectedClientId} onChange={(event) => onClientProjectFormChange({ ...clientProjectForm, clientId: event.target.value })}>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </SelectInput>
            <SelectInput value={selectedProjectId} onChange={(event) => onClientProjectFormChange({ ...clientProjectForm, projectId: event.target.value })}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </SelectInput>
            <Button type="submit" disabled={!clients.length || !projects.length}>Привязать проект</Button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">Вход клиента с лендинга</p>
              <p className="mt-1 text-sm text-neutral-500">Публичный путь: {clientPath}</p>
            </div>
            <Button asChild variant="outline">
              <Link href={clientPath}>Открыть кабинет</Link>
            </Button>
          </div>

          <div className="grid gap-3">
            {clients.map((client) => {
              const clientProjects = projects.filter((project) => project.clientId === client.id);
              return (
                <div key={client.id} className="rounded-lg border bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold">{client.name}</p>
                      <p className="mt-1 text-sm text-neutral-500">{client.phone} · {client.email}</p>
                      <p className="mt-1 text-xs font-medium text-neutral-700">Вход: почта или телефон · пароль: {client.password || 'client123'}</p>
                    </div>
                    <Badge tone={clientProjects.length ? 'green' : 'amber'}>{clientProjects.length} проект(а)</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {clientProjects.map((project) => (
                      <button
                        key={project.id}
                        className="flex w-full items-center justify-between rounded-md bg-neutral-50 px-3 py-2 text-left text-sm hover:bg-neutral-100"
                        type="button"
                        onClick={() => onOpenProject(project.id, 'projects')}
                      >
                        <span>
                          <span className="block font-medium">{project.title}</span>
                          <span className="text-xs text-neutral-500">{project.address}</span>
                        </span>
                        <Badge>{project.progress}%</Badge>
                      </button>
                    ))}
                    {!clientProjects.length ? <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-500">Проект еще не привязан.</p> : null}
                  </div>
                </div>
              );
            })}
            {!clients.length ? <p className="rounded-lg bg-white p-4 text-sm text-neutral-500">Создайте первого клиента для личного кабинета.</p> : null}
          </div>

          <div className="rounded-lg border bg-white p-4">
            <p className="font-semibold">Проекты без клиента</p>
            <div className="mt-3 space-y-2">
              {projects.filter((project) => !clientById.has(project.clientId)).map((project) => (
                <p key={project.id} className="rounded-md bg-neutral-50 p-3 text-sm">{project.title}</p>
              ))}
              {!projects.some((project) => !clientById.has(project.clientId)) ? <p className="text-sm text-neutral-500">Все проекты уже привязаны.</p> : null}
            </div>
          </div>
        </div>
      </div>
    </SimplePanel>
  );
}

function DocumentsPanel({
  data,
  selectedProjectId,
  form,
  onFormChange,
  onSubmit,
}: {
  data: RepairData;
  selectedProjectId: string;
  form: { templateId: string; projectId: string; stageId: string; values: Record<string, string> };
  onFormChange: (form: { templateId: string; projectId: string; stageId: string; values: Record<string, string> }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const template = data.documentTemplates.find((item) => item.id === form.templateId) ?? data.documentTemplates[0];
  const projectId = form.projectId || selectedProjectId;
  const projectStages = data.stages.filter((stage) => stage.projectId === projectId);
  return (
    <SimplePanel title="Документы и шаблоны">
      <form className="grid gap-4 rounded-lg border bg-white p-4 xl:grid-cols-2" onSubmit={onSubmit}>
        <div className="space-y-3">
          <Field label="Шаблон">
            <SelectInput value={template?.id ?? ''} onChange={(event) => onFormChange({ ...form, templateId: event.target.value, values: {} })}>
              {data.documentTemplates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </SelectInput>
          </Field>
          <Field label="Проект">
            <SelectInput value={projectId} onChange={(event) => onFormChange({ ...form, projectId: event.target.value, stageId: '' })}>
              {data.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </SelectInput>
          </Field>
          <Field label="Этап">
            <SelectInput value={form.stageId} onChange={(event) => onFormChange({ ...form, stageId: event.target.value })}>
              <option value="">Без этапа</option>
              {projectStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}
            </SelectInput>
          </Field>
        </div>
        <div className="space-y-3">
          {template?.fields.map((field) => (
            <Field key={field} label={field}>
              <Input value={form.values[field] ?? ''} onChange={(event) => onFormChange({ ...form, values: { ...form.values, [field]: event.target.value } })} />
            </Field>
          ))}
          <Button type="submit">
            <FilePlus2 className="h-4 w-4" aria-hidden />
            Создать документ
          </Button>
        </div>
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {data.documents.map((document) => (
          <div key={document.id} className="rounded-lg border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{document.title}</p>
                <p className="mt-1 text-xs text-neutral-500">{document.type} · {formatDate(document.uploadedAt)}</p>
              </div>
              <Badge tone={document.visibleForClient ? 'green' : 'neutral'}>{document.visibleForClient ? 'клиент видит' : 'внутренний'}</Badge>
            </div>
            {document.content ? <p className="mt-3 text-sm leading-6 text-neutral-600">{document.content}</p> : null}
          </div>
        ))}
      </div>
    </SimplePanel>
  );
}

function FinancePanel({
  projects,
  payments,
  form,
  onFormChange,
  onSubmit,
  pendingPayments,
  totalBudget,
  paid,
}: {
  projects: RepairProject[];
  payments: RepairData['payments'];
  form: { projectId: string; amount: string; date: string; type: (typeof paymentTypes)[number]; status: RepairPaymentStatus };
  onFormChange: (form: { projectId: string; amount: string; date: string; type: (typeof paymentTypes)[number]; status: RepairPaymentStatus }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pendingPayments: number;
  totalBudget: number;
  paid: number;
}) {
  return (
    <SimplePanel title="Финансовый учет">
      <div className="grid gap-4 md:grid-cols-3">
        <PortalMetric title="Бюджет проектов" value={formatAmount(totalBudget)} icon={WalletCards} />
        <PortalMetric title="Оплачено" value={formatAmount(paid)} icon={CircleDollarSign} />
        <PortalMetric title="Ожидается" value={formatAmount(pendingPayments)} icon={ClipboardList} danger={pendingPayments > 0} />
      </div>
      <form className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-5" onSubmit={onSubmit}>
        <SelectInput value={form.projectId || (projects[0]?.id ?? '')} onChange={(event) => onFormChange({ ...form, projectId: event.target.value })}>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
        </SelectInput>
        <Input placeholder="Сумма" type="number" min={1} value={form.amount} onChange={(event) => onFormChange({ ...form, amount: event.target.value })} />
        <Input type="date" value={form.date} onChange={(event) => onFormChange({ ...form, date: event.target.value })} />
        <SelectInput value={form.type} onChange={(event) => onFormChange({ ...form, type: event.target.value as (typeof paymentTypes)[number] })}>
          {paymentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </SelectInput>
        <div className="flex gap-2">
          <SelectInput value={form.status} onChange={(event) => onFormChange({ ...form, status: event.target.value as RepairPaymentStatus })}>
            {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </SelectInput>
          <Button size="icon" title="Добавить платеж">
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </form>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          {projects.map((project) => {
            const percent = Math.round((project.paid / Math.max(project.budget, 1)) * 100);
            return (
              <div key={project.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{project.title}</p>
                    <p className="mt-1 text-sm text-neutral-500">Баланс: {formatAmount(Math.max(0, project.budget - project.paid))}</p>
                  </div>
                  <Badge tone={percent >= 80 ? 'green' : 'amber'}>{percent}% оплачено</Badge>
                </div>
                <Progress value={percent} className="mt-4 bg-neutral-100" barClassName="bg-[#caa146]" />
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg border bg-white p-4">
              <div>
                <p className="font-semibold">{projects.find((project) => project.id === payment.projectId)?.title ?? 'Проект'}</p>
                <p className="text-sm text-neutral-500">{payment.type} · {formatDate(payment.date)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatAmount(payment.amount)}</p>
                <Badge tone={payment.status === 'оплачено' ? 'green' : 'amber'}>{payment.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SimplePanel>
  );
}

function MaterialsPanel({
  projects,
  materials,
  form,
  onFormChange,
  onSubmit,
  onStatusChange,
  totalCost,
}: {
  projects: RepairProject[];
  materials: RepairData['materials'];
  form: { projectId: string; title: string; category: string; quantity: string; price: string; supplier: string; status: RepairMaterialStatus };
  onFormChange: (form: { projectId: string; title: string; category: string; quantity: string; price: string; supplier: string; status: RepairMaterialStatus }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStatusChange: (id: string, status: RepairMaterialStatus) => void;
  totalCost: number;
}) {
  return (
    <SimplePanel title="Материальный учет">
      <div className="grid gap-4 md:grid-cols-4">
        <PortalMetric title="Позиций" value={materials.length} icon={PackageCheck} />
        <PortalMetric title="Стоимость" value={formatAmount(totalCost)} icon={CircleDollarSign} />
        <PortalMetric title="Купить" value={materials.filter((item) => item.status === 'нужно купить').length} icon={ClipboardList} danger />
        <PortalMetric title="Доставлено" value={materials.filter((item) => item.status === 'доставлено' || item.status === 'оплачено').length} icon={CheckCircle2} />
      </div>
      <form className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-4 xl:grid-cols-7" onSubmit={onSubmit}>
        <SelectInput value={form.projectId || (projects[0]?.id ?? '')} onChange={(event) => onFormChange({ ...form, projectId: event.target.value })}>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
        </SelectInput>
        <Input placeholder="Материал" value={form.title} onChange={(event) => onFormChange({ ...form, title: event.target.value })} />
        <Input placeholder="Категория" value={form.category} onChange={(event) => onFormChange({ ...form, category: event.target.value })} />
        <Input placeholder="Кол-во" value={form.quantity} onChange={(event) => onFormChange({ ...form, quantity: event.target.value })} />
        <Input placeholder="Цена" type="number" value={form.price} onChange={(event) => onFormChange({ ...form, price: event.target.value })} />
        <Input placeholder="Поставщик" value={form.supplier} onChange={(event) => onFormChange({ ...form, supplier: event.target.value })} />
        <Button>
          <PackagePlus className="h-4 w-4" aria-hidden />
          Добавить
        </Button>
      </form>
      <div className="space-y-3">
        {materials.map((material) => (
          <div key={material.id} className="rounded-lg border bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold">{material.title}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {projects.find((project) => project.id === material.projectId)?.title ?? 'Проект'} · {material.category} · {material.quantity} · {material.supplier}
                </p>
              </div>
              <div className="text-left lg:text-right">
                <p className="font-semibold">{formatAmount(material.price)}</p>
                <Badge tone={material.status === 'нужно купить' ? 'rose' : material.status === 'оплачено' ? 'green' : 'amber'}>{material.status}</Badge>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {materialStatuses.map((status) => (
                <Button key={status} size="sm" variant={material.status === status ? 'default' : 'outline'} type="button" onClick={() => onStatusChange(material.id, status)}>
                  {status}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SimplePanel>
  );
}

function ReportsPanel({
  projects,
  stages,
  reports,
  form,
  onFormChange,
  onFileChange,
  onMediaRemove,
  onSubmit,
}: {
  projects: RepairProject[];
  stages: RepairStage[];
  reports: RepairData['photoReports'];
  form: { projectId: string; stageId: string; title: string; description: string; mediaUrl: string; media: RepairReportMedia[]; visibleForClient: boolean };
  onFormChange: (form: { projectId: string; stageId: string; title: string; description: string; mediaUrl: string; media: RepairReportMedia[]; visibleForClient: boolean }) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMediaRemove: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const projectId = form.projectId || (projects[0]?.id ?? '');
  const projectStages = stages.filter((stage) => stage.projectId === projectId);
  const previewMedia = [
    ...form.media,
    ...(form.mediaUrl.trim()
      ? [
          {
            id: 'url-preview',
            type: /\.(mp4|webm|mov|m4v)(\?|$)/i.test(form.mediaUrl.trim()) ? ('video' as const) : ('image' as const),
            url: form.mediaUrl.trim(),
            name: 'Ссылка',
          },
        ]
      : []),
  ];
  return (
    <SimplePanel title="Фотоотчеты">
      <form className="grid gap-4 rounded-lg border bg-white p-4 xl:grid-cols-[1fr_1fr]" onSubmit={onSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Проект">
            <SelectInput value={projectId} onChange={(event) => onFormChange({ ...form, projectId: event.target.value, stageId: '' })}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </SelectInput>
          </Field>
          <Field label="Этап">
            <SelectInput value={form.stageId || (projectStages[0]?.id ?? '')} onChange={(event) => onFormChange({ ...form, stageId: event.target.value })}>
              {projectStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}
            </SelectInput>
          </Field>
          <Field label="Название">
            <Input value={form.title} onChange={(event) => onFormChange({ ...form, title: event.target.value })} />
          </Field>
          <Field label="URL фото или видео">
            <Input value={form.mediaUrl} onChange={(event) => onFormChange({ ...form, mediaUrl: event.target.value })} placeholder="Можно вставить ссылку или загрузить файлы" />
          </Field>
          <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-3 text-sm font-medium hover:bg-neutral-50">
            <Upload className="h-4 w-4" aria-hidden />
            Загрузить фото/видео
            <input className="sr-only" accept="image/*,video/*" multiple onChange={onFileChange} type="file" />
          </label>
          <label className="flex h-10 items-center gap-2 rounded-md border bg-white px-3 text-sm">
            <input checked={form.visibleForClient} onChange={(event) => onFormChange({ ...form, visibleForClient: event.target.checked })} type="checkbox" />
            Видно клиенту
          </label>
        </div>
        <div className="space-y-3">
          <Field label="Комментарий">
            <TextareaInput value={form.description} onChange={(event) => onFormChange({ ...form, description: event.target.value })} />
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            {previewMedia.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-lg border bg-neutral-50">
                <ReportMedia media={item} className="h-36 w-full" />
                {item.id !== 'url-preview' ? (
                  <button className="w-full px-3 py-2 text-left text-xs font-medium text-rose-700" onClick={() => onMediaRemove(item.id)} type="button">
                    Убрать
                  </button>
                ) : null}
              </div>
            ))}
            {!previewMedia.length ? <p className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-500 sm:col-span-2">Добавьте одно или несколько фото/видео.</p> : null}
          </div>
          <Button type="submit">
            <Camera className="h-4 w-4" aria-hidden />
            Создать фотоотчет
          </Button>
        </div>
      </form>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <article key={report.id} className="overflow-hidden rounded-lg border bg-white">
            <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-1">
              {reportMediaItems(report).slice(0, 4).map((item) => (
                <ReportMedia key={item.id} media={item} className="h-36 w-full rounded-md" />
              ))}
              {!reportMediaItems(report).length ? <div className="col-span-2 flex h-52 items-center justify-center text-neutral-400">Без медиа</div> : null}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{report.title}</p>
                  <p className="text-xs text-neutral-500">{formatDate(report.date)}</p>
                </div>
                <Badge tone={report.visibleForClient ? 'green' : 'neutral'}>{report.visibleForClient ? 'клиент' : 'внутри'}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{report.description}</p>
            </div>
          </article>
        ))}
      </div>
    </SimplePanel>
  );
}

function reportMediaItems(report: RepairData['photoReports'][number]): RepairReportMedia[] {
  if (report.media?.length) return report.media;
  return report.imageUrl ? [{ id: `${report.id}-image`, type: 'image', url: report.imageUrl, name: report.title }] : [];
}

function ReportMedia({ media, className }: { media: RepairReportMedia; className: string }) {
  const src = useResolvedMediaUrl(media.url);

  if (media.type === 'video') {
    return (
      <div className={`${className} relative overflow-hidden bg-neutral-950`}>
        {src ? <video className="h-full w-full object-cover" controls playsInline preload="metadata" src={src} title={media.name ?? 'Видео'} /> : null}
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
          Видео{media.name ? ` · ${media.name}` : ''}
        </span>
      </div>
    );
  }

  return (
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={media.name ?? 'Фотоотчет'} className={`${className} object-cover`} />
    ) : (
      <div className={`${className} flex items-center justify-center bg-neutral-100 text-xs text-neutral-500`}>Файл сохранен</div>
    )
  );
}

function AnalyticsPanel({
  projects,
  tasks,
  materials,
  teamById,
  averageProgress,
  paid,
  receivable,
  overdue,
}: {
  projects: RepairProject[];
  tasks: RepairTask[];
  materials: RepairData['materials'];
  teamById: Map<string, { name: string }>;
  averageProgress: number;
  paid: number;
  receivable: number;
  overdue: number;
}) {
  const statusCounts = projects.reduce<Record<string, number>>((acc, project) => {
    acc[project.status] = (acc[project.status] ?? 0) + 1;
    return acc;
  }, {});
  const materialCounts = materials.reduce<Record<string, number>>((acc, material) => {
    acc[material.status] = (acc[material.status] ?? 0) + 1;
    return acc;
  }, {});
  const workload = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.assigneeId] = (acc[task.assigneeId] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <SimplePanel title="Аналитика">
      <div className="grid gap-4 md:grid-cols-4">
        <PortalMetric title="Средний прогресс" value={`${averageProgress}%`} icon={BarChart3} />
        <PortalMetric title="Оплачено" value={formatAmount(paid)} icon={CircleDollarSign} />
        <PortalMetric title="Дебиторка" value={formatAmount(receivable)} icon={WalletCards} danger={receivable > 0} />
        <PortalMetric title="Просрочено" value={overdue} icon={ClipboardList} danger={overdue > 0} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <AnalyticsBlock title="Проекты по статусам" rows={Object.entries(statusCounts).map(([label, value]) => ({ label, value }))} total={projects.length} />
        <AnalyticsBlock title="Материалы" rows={Object.entries(materialCounts).map(([label, value]) => ({ label, value }))} total={materials.length} />
        <AnalyticsBlock title="Нагрузка команды" rows={Object.entries(workload).map(([id, value]) => ({ label: teamById.get(id)?.name ?? 'Сотрудник', value }))} total={tasks.length} />
      </div>
    </SimplePanel>
  );
}

function AnalyticsBlock({ title, rows, total }: { title: string; rows: { label: string; value: number }[]; total: number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="font-semibold">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between text-sm">
              <span>{row.label}</span>
              <span className="font-semibold">{row.value}</span>
            </div>
            <Progress value={Math.round((row.value / Math.max(total, 1)) * 100)} className="mt-2 bg-neutral-100" barClassName="bg-[#caa146]" />
          </div>
        ))}
        {!rows.length ? <p className="text-sm text-neutral-500">Данных пока нет.</p> : null}
      </div>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return <div className="rounded-lg bg-neutral-50 p-3"><p className="text-xs text-neutral-500">{title}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function SimplePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-xl">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
