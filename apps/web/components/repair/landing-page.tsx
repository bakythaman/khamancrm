'use client';

import Link from 'next/link';
import { ArrowRight, BadgeCheck, Calculator, CheckCircle2, ClipboardList, Home, Layers3, MapPin, MessageCircle, Phone, Ruler, Sparkles } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useCrmData } from '@/hooks/useCrmData';
import { useToast } from '@/hooks/useToast';
import { formatAmount } from '@/lib/i18n/format';
import { getPublicRepairData, getPublicRepairDataByUsername, projectDuration, repairClassMultipliers, repairClientPath, repairRates, repairTypeMultipliers } from '@/lib/repair/platform';
import type { RepairProject } from '@/lib/storage/types';

const serviceIcons = [Sparkles, Home, Ruler, ClipboardList, Layers3, BadgeCheck];
const templateProject: RepairProject = {
  id: 'template',
  title: 'Первый объект',
  clientId: 'template-client',
  address: 'Адрес объекта',
  city: 'Шымкент',
  area: 90,
  objectType: 'квартира',
  service: 'дизайн + ремонт',
  status: 'новый',
  startDate: '2026-06-01',
  dueDate: '2026-09-01',
  managerId: 'template-manager',
  designerId: 'template-designer',
  foremanId: 'template-foreman',
  budget: 15000000,
  paid: 0,
  progress: 0,
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function routeUsernameFromLocation() {
  const queryUsername = new URLSearchParams(window.location.search).get('u');
  if (queryUsername) return queryUsername;

  const parts = window.location.pathname.split('/').filter(Boolean);
  const candidate = parts.at(-1);
  if (!candidate || candidate === 'site' || candidate === 'khamancrm') return null;
  return decodeURIComponent(candidate);
}

export function RepairLandingPage({ routeUsername }: { routeUsername?: string }) {
  const { company, currentUser } = useAuth();
  const { repair, createDeal } = useCrmData();
  const { showToast } = useToast();
  const [landingUsername, setLandingUsername] = useState<string | null>(null);
  const publicPlatform = useMemo(() => getPublicRepairDataByUsername(landingUsername), [landingUsername]);
  const platform = publicPlatform ?? getPublicRepairData(company?.vertical === 'repair' ? repair : undefined, company?.name);
  const site = platform.site;
  const portfolio = platform.projects.slice(0, 4);
  const [objectType, setObjectType] = useState<keyof typeof repairTypeMultipliers>('квартира');
  const [area, setArea] = useState(94);
  const [service, setService] = useState<keyof typeof repairRates>('дизайн + ремонт');
  const [repairClass, setRepairClass] = useState<keyof typeof repairClassMultipliers>('комфорт');
  const [city, setCity] = useState(site.cities[0] ?? 'Шымкент');
  const [furniture, setFurniture] = useState(true);
  const [supervision, setSupervision] = useState(true);
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', whatsapp: '', comment: '' });
  const [saved, setSaved] = useState(false);
  const clientPath = repairClientPath(site.username);

  useEffect(() => {
    setLandingUsername(routeUsername ?? routeUsernameFromLocation());
  }, [routeUsername]);

  const estimate = useMemo(() => {
    const cityMultiplier = city === 'Алматы' ? 1.12 : city === 'другое' ? 1.08 : 1;
    const extras = (furniture ? 18000 : 0) + (supervision ? 9000 : 0);
    return Math.round(area * (repairRates[service] + extras) * repairClassMultipliers[repairClass] * repairTypeMultipliers[objectType] * cityMultiplier);
  }, [area, city, furniture, objectType, repairClass, service, supervision]);

  function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clientName = leadForm.name.trim() || 'Новая заявка';
    const phone = leadForm.phone.trim();
    if (!phone) return;

    if (currentUser && company?.vertical === 'repair') {
      createDeal({
        title: `${service}: ${area} м²`,
        clientName,
        phone,
        amount: estimate,
        stageId: 'lead',
        status: 'active',
        assignedTo: currentUser.id,
      });
      showToast('Заявка с лендинга добавлена в воронку');
    } else {
      showToast('Демо-заявка принята. После входа компании она будет попадать в CRM.', 'info');
    }
    setSaved(true);
    setLeadForm({ name: '', phone: '', whatsapp: '', comment: '' });
  }

  return (
    <main
      className="min-h-screen bg-[#f7f5f0] text-neutral-950"
      style={{ '--site-primary': site.primaryColor, '--site-accent': site.accentColor } as CSSProperties}
    >
      <section
        className="relative min-h-[88vh] overflow-hidden bg-neutral-950 text-white"
        style={{
          backgroundImage:
            `linear-gradient(90deg, rgba(10,10,10,0.86), rgba(10,10,10,0.48), rgba(10,10,10,0.25)), url(${site.heroImageUrl})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-6">
          <button className="text-left text-xl font-semibold" onClick={() => scrollToId('top')} type="button">
            {site.brandName}
          </button>
          <div className="hidden items-center gap-6 text-sm text-white/80 md:flex">
            <button onClick={() => scrollToId('calculator')} type="button">Калькулятор</button>
            <button onClick={() => scrollToId('portfolio')} type="button">Проекты</button>
            <Link href={clientPath}>Кабинет клиента</Link>
            <Link href="/login">Вход команды</Link>
          </div>
          <a className="hidden items-center gap-2 text-sm font-medium md:inline-flex" href={`tel:${site.phone.replaceAll(' ', '')}`}>
            <Phone className="h-4 w-4" aria-hidden />
            {site.phone}
          </a>
        </nav>

        <div id="top" className="mx-auto flex min-h-[calc(88vh-80px)] max-w-7xl items-center px-4 pb-16 pt-12 md:px-6">
          <div className="max-w-3xl">
            <Badge tone="green" className="mb-6 bg-emerald-400/18 text-emerald-100">
              {site.cities.join(' · ')} · платформа в Khaman CRM
            </Badge>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] md:text-7xl">{site.headline}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/84 md:text-xl">{site.subheadline}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => scrollToId('calculator')}>
                <Calculator className="h-4 w-4" aria-hidden />
                Рассчитать стоимость
              </Button>
              <Button variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" onClick={() => scrollToId('portfolio')}>
                Посмотреть проекты
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button asChild variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                <Link href={clientPath}>Кабинет клиента</Link>
              </Button>
            </div>
            <div className="mt-12 grid max-w-2xl grid-cols-3 gap-4 text-sm text-white/78">
              <div>
                <p className="text-3xl font-semibold text-white">{platform.projects.length || 1}</p>
                <p>объектов в системе</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">{platform.tasks.length || 1}</p>
                <p>задач команды</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">{site.cities.length}</p>
                <p>города работы</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="calculator" className="bg-white py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <Badge tone="neutral">Калькулятор</Badge>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold md:text-5xl">Предварительный бюджет за одну минуту</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-neutral-600">
              Заявка с этого лендинга попадает в воронку ремонтной компании в Khaman CRM: дальше менеджер ведет клиента до замера, договора и объекта.
            </p>
            <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm text-neutral-600">Предварительно</p>
              <p className="mt-2 text-4xl font-semibold">от {formatAmount(estimate)}</p>
              <Progress value={Math.min(100, Math.round(area / 3))} className="mt-5 bg-neutral-100" barClassName="bg-[var(--site-accent)]" />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Расчет и заявка</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={submitLead}>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectBox label="Тип объекта" value={objectType} onChange={(value) => setObjectType(value as keyof typeof repairTypeMultipliers)} options={Object.keys(repairTypeMultipliers)} />
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-neutral-700">Площадь, м²</span>
                    <Input min={20} type="number" value={area} onChange={(event) => setArea(Number(event.target.value))} />
                  </label>
                  <SelectBox label="Услуга" value={service} onChange={(value) => setService(value as keyof typeof repairRates)} options={Object.keys(repairRates)} />
                  <SelectBox label="Класс ремонта" value={repairClass} onChange={(value) => setRepairClass(value as keyof typeof repairClassMultipliers)} options={Object.keys(repairClassMultipliers)} />
                  <SelectBox label="Город" value={city} onChange={setCity} options={[...site.cities, 'другое']} />
                  <div className="grid grid-cols-2 gap-3 pt-7">
                    <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                      <input checked={furniture} onChange={(event) => setFurniture(event.target.checked)} type="checkbox" />
                      Мебель
                    </label>
                    <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                      <input checked={supervision} onChange={(event) => setSupervision(event.target.checked)} type="checkbox" />
                      Надзор
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 border-t pt-4 md:grid-cols-2">
                  <Input placeholder="Имя" required value={leadForm.name} onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })} />
                  <Input placeholder="Телефон" required value={leadForm.phone} onChange={(event) => setLeadForm({ ...leadForm, phone: event.target.value })} />
                  <Input placeholder="WhatsApp" value={leadForm.whatsapp} onChange={(event) => setLeadForm({ ...leadForm, whatsapp: event.target.value })} />
                  <Input placeholder="Комментарий" value={leadForm.comment} onChange={(event) => setLeadForm({ ...leadForm, comment: event.target.value })} />
                </div>
                <Button type="submit">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Получить точный расчет
                </Button>
                {saved ? <p className="text-sm font-medium text-emerald-700">Заявка принята. В Khaman CRM она ведется как лид ремонтной компании.</p> : null}
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Badge tone="green">Услуги</Badge>
              <h2 className="mt-4 max-w-2xl text-4xl font-semibold">Ремонтная компания получает готовый сайт и CRM-процессы</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-neutral-600">
              Это лендинг внутри Khaman CRM: клиенты оставляют заявки, команда работает в CRM, клиент видит ход объекта в своем кабинете.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {site.services.map((serviceItem, index) => {
              const Icon = serviceIcons[index % serviceIcons.length] ?? Sparkles;
              return (
                <Card key={serviceItem.title} className="min-h-48">
                  <CardHeader className="block">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-neutral-950 text-amber-300">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <CardTitle className="text-base">{serviceItem.title}</CardTitle>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">{serviceItem.text}</p>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="portfolio" className="bg-neutral-950 py-16 text-white md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <Badge className="bg-[var(--site-accent)] text-white">Проекты</Badge>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold">Объекты, которые ведутся в рабочей системе</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {(portfolio.length ? portfolio : [templateProject]).map((project, index) => (
              <article key={project.id} className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
                <div
                  className="h-72 bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.36)), url(https://images.unsplash.com/photo-${index % 2 === 0 ? '1600566753190-17f0baa2a6c3' : '1600607687920-4e2a09cf159d'}?auto=format&fit=crop&w=1000&q=80)`,
                  }}
                />
                <div className="space-y-4 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-semibold">{project.title}</h3>
                      <p className="text-sm text-white/64">{project.area} м² · {project.city} · {project.objectType}</p>
                    </div>
                    <Badge tone="green">{projectDuration(project)}</Badge>
                  </div>
                  <p className="text-sm text-white/72">{project.service} · прогресс {project.progress}%</p>
                  <Progress value={project.progress} className="bg-white/10" barClassName="bg-[var(--site-accent)]" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Badge tone="neutral">Процесс</Badge>
            <h2 className="mt-4 text-4xl font-semibold">Как проходит работа</h2>
            <p className="mt-4 text-sm leading-6 text-neutral-600">
              Каждый этап фиксируется в CRM: дедлайны, ответственные, задачи рабочих, фото, файлы, оплаты и согласования.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {site.process.map((step, index) => (
              <div key={step} className="flex items-center gap-4 rounded-lg border bg-neutral-50 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent)] font-semibold text-white">{index + 1}</span>
                <p className="font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-6 lg:grid-cols-2">
          <div>
            <Badge tone="green">Преимущества</Badge>
            <h2 className="mt-4 text-4xl font-semibold">Сайт, CRM и кабинет клиента работают вместе</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {site.advantages.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-neutral-950 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:px-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <h2 className="text-4xl font-semibold">Обсудим ваш объект?</h2>
            <p className="mt-4 max-w-xl text-white/70">Оставьте заявку, и менеджер подготовит точный расчет после консультации и замера.</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/75">
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--site-accent)]" aria-hidden />{site.address}</span>
              <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-[var(--site-accent)]" aria-hidden />{site.phone}</span>
            </div>
          </div>
          <form className="grid gap-3 rounded-lg bg-white p-5 text-neutral-950" onSubmit={submitLead}>
            <Input placeholder="Имя" required value={leadForm.name} onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })} />
            <Input placeholder="Телефон" required value={leadForm.phone} onChange={(event) => setLeadForm({ ...leadForm, phone: event.target.value })} />
            <Input placeholder="Что нужно сделать?" value={leadForm.comment} onChange={(event) => setLeadForm({ ...leadForm, comment: event.target.value })} />
            <Button type="submit">Оставить заявку</Button>
          </form>
        </div>
      </section>
    </main>
  );
}

function SelectBox({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <select
        className="flex h-10 w-full rounded-md border bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
