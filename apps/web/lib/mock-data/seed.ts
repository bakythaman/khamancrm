import { createDefaultRoles } from '@/lib/permissions';
import type {
  CompanyData,
  CompanyVertical,
  Deal,
  PipelineAutomation,
  PipelineStage,
  RepairData,
  RepairDocumentTemplate,
  RepairSiteDraft,
  RepairSiteService,
  TeamGroup,
  TeamMember,
  User,
} from '@/lib/storage/types';

const now = () => new Date().toISOString();

export const pipelineStages = ['new', 'contacted', 'negotiation', 'won', 'lost'] as const;

export const defaultTeamGroupIds = {
  all: 'all-team',
  managers: 'managers',
  leaders: 'leaders',
} as const;

export function createDefaultPipelineStages(createdAt = now()): PipelineStage[] {
  return [
    { id: 'new', name: 'Новые', color: '#64748b', order: 0, isDefault: true, createdAt },
    { id: 'contacted', name: 'Связались', color: '#2563eb', order: 1, isDefault: true, createdAt },
    { id: 'negotiation', name: 'Переговоры', color: '#d97706', order: 2, isDefault: true, createdAt },
    { id: 'won', name: 'Выиграно', color: '#059669', order: 3, isDefault: true, createdAt },
    { id: 'lost', name: 'Потеряно', color: '#e11d48', order: 4, isDefault: true, createdAt },
  ];
}

export function createRepairPipelineStages(createdAt = now()): PipelineStage[] {
  return [
    { id: 'lead', name: 'Заявка', color: '#64748b', order: 0, isDefault: true, createdAt },
    { id: 'measurement', name: 'Замер', color: '#2563eb', order: 1, isDefault: true, createdAt },
    { id: 'estimate', name: 'Смета', color: '#d97706', order: 2, isDefault: true, createdAt },
    { id: 'contract', name: 'Договор', color: '#7c3aed', order: 3, isDefault: true, createdAt },
    { id: 'project', name: 'Проект в работе', color: '#059669', order: 4, isDefault: true, createdAt },
    { id: 'lost', name: 'Отказ', color: '#e11d48', order: 5, isDefault: true, createdAt },
  ];
}

export function createDefaultSettings() {
  return {
    notificationsEnabled: false,
    notificationPermission: undefined,
    logoDataUrl: undefined,
    automation: [true, true, false],
  };
}

export function createDefaultPipelineAutomations(createdAt = now()): PipelineAutomation[] {
  return [
    {
      id: crypto.randomUUID(),
      type: 'robot',
      name: 'Задача после нового лида',
      stageId: 'new',
      message: 'Создать задачу ответственному менеджеру через 15 минут после появления нового лида.',
      enabled: true,
      createdAt,
    },
    {
      id: crypto.randomUUID(),
      type: 'trigger',
      name: 'Триггер при выигрыше сделки',
      stageId: 'won',
      message: 'Показать уведомление руководителю, когда сделка перешла в выигранные.',
      enabled: true,
      createdAt,
    },
    {
      id: crypto.randomUUID(),
      type: 'broadcast',
      name: 'Рассылка по потерянным лидам',
      stageId: 'lost',
      message: 'Подготовить мягкое сообщение для повторного контакта через 7 дней.',
      enabled: false,
      createdAt,
    },
  ];
}

export function createDefaultTeamGroups(createdBy: string, members: TeamMember[], createdAt = now()): TeamGroup[] {
  const allMemberIds = members.map((member) => member.id);
  const managerIds = members.filter((member) => member.role === 'manager').map((member) => member.id);
  const leaderIds = members.filter((member) => member.role === 'owner' || member.role === 'admin').map((member) => member.id);

  return [
    {
      id: defaultTeamGroupIds.all,
      name: 'Вся команда',
      memberIds: allMemberIds,
      createdBy,
      createdAt,
      isDefault: true,
    },
    {
      id: defaultTeamGroupIds.managers,
      name: 'Менеджеры',
      memberIds: managerIds.length ? managerIds : allMemberIds,
      createdBy,
      createdAt,
      isDefault: true,
    },
    {
      id: defaultTeamGroupIds.leaders,
      name: 'Руководители',
      memberIds: leaderIds.length ? leaderIds : [createdBy],
      createdBy,
      createdAt,
      isDefault: true,
    },
  ];
}

export function createEmptyCompanyData(owner: User): CompanyData {
  return createCompanyDataForVertical(owner, 'sales');
}

export function createCompanyDataForVertical(owner: User, vertical: CompanyVertical = 'sales', companyName?: string, repairSite?: RepairSiteDraft): CompanyData {
  const ownerMember: TeamMember = {
    id: owner.id,
    name: owner.name,
    email: owner.email,
    phone: owner.phone,
    role: owner.role,
    status: 'active',
    avatarDataUrl: owner.avatarDataUrl,
  };

  return {
    deals: [],
    tasks: [],
    teamMembers: [ownerMember],
    teamGroups: createDefaultTeamGroups(owner.id, [ownerMember]),
    pipelineStages: vertical === 'repair' ? createRepairPipelineStages() : createDefaultPipelineStages(),
    pipelineAutomations: createDefaultPipelineAutomations(),
    teamMessages: [],
    roles: createDefaultRoles(),
    settings: createDefaultSettings(),
    repair: vertical === 'repair' ? createEmptyRepairData(companyName, repairSite) : undefined,
  };
}

function splitLines(value?: string) {
  return value
    ?.split('\n')
    .map((line) => line.trim())
    .filter(Boolean) ?? [];
}

function parseServices(value?: string): RepairSiteService[] {
  return splitLines(value).map((line) => {
    const [title, ...rest] = line.split(/[-:—]/);
    return {
      title: title?.trim() || line,
      text: rest.join(' - ').trim() || 'Описание услуги можно уточнить в редакторе сайта.',
    };
  });
}

function splitCommaList(value?: string) {
  return value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

export function slugifyLandingUsername(value?: string, fallback = 'repair-company') {
  const slug = (value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);

  return slug || fallback;
}

export function createRepairDocumentTemplates(): RepairDocumentTemplate[] {
  return [
    {
      id: 'template-contract',
      title: 'Договор на ремонт',
      type: 'Договор',
      fields: ['Клиент', 'Объект', 'Адрес', 'Бюджет', 'Срок сдачи'],
      body: 'Договор между компанией и клиентом {{Клиент}} по объекту {{Объект}}. Адрес: {{Адрес}}. Бюджет: {{Бюджет}}. Срок сдачи: {{Срок сдачи}}.',
    },
    {
      id: 'template-estimate',
      title: 'Смета по этапу',
      type: 'Смета',
      fields: ['Проект', 'Этап', 'Работы', 'Материалы', 'Сумма'],
      body: 'Смета по проекту {{Проект}}, этап {{Этап}}. Работы: {{Работы}}. Материалы: {{Материалы}}. Итого: {{Сумма}}.',
    },
    {
      id: 'template-act',
      title: 'Акт выполненных работ',
      type: 'Акт',
      fields: ['Клиент', 'Проект', 'Этап', 'Дата', 'Комментарий'],
      body: 'Акт выполненных работ для клиента {{Клиент}} по проекту {{Проект}}. Этап: {{Этап}}. Дата: {{Дата}}. Комментарий: {{Комментарий}}.',
    },
  ];
}

export function createDefaultRepairSiteSettings(companyName = 'Новая ремонтная компания', draft?: RepairSiteDraft) {
  const services = parseServices(draft?.servicesText);
  const cities = splitCommaList(draft?.cities);
  return {
    username: slugifyLandingUsername(draft?.username || companyName),
    brandName: draft?.brandName?.trim() || companyName,
    headline: draft?.headline?.trim() || 'Дизайн и ремонт под ключ',
    subheadline: draft?.subheadline?.trim() || 'От заявки и замера до ремонта, фотоотчетов, оплат и сдачи объекта в одном кабинете.',
    cities: cities.length ? cities : ['Шымкент', 'Алматы'],
    phone: draft?.phone?.trim() || '+7 700 000 00 00',
    whatsapp: draft?.whatsapp?.trim() || draft?.phone?.trim() || '+7 700 000 00 00',
    address: draft?.address?.trim() || 'Адрес офиса можно указать в настройках компании',
    heroImageUrl: draft?.heroImageUrl?.trim() || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=85',
    primaryColor: draft?.primaryColor?.trim() || '#111111',
    accentColor: draft?.accentColor?.trim() || '#d6a83f',
    services: services.length ? services : [
      {
        title: 'Дизайн-проект',
        text: 'Планировки, визуализации, рабочие чертежи и подбор материалов.',
      },
      {
        title: 'Ремонт под ключ',
        text: 'Полный цикл работ от демонтажа и инженерии до чистовой отделки.',
      },
      {
        title: 'Комплектация',
        text: 'Материалы, мебель, свет, поставщики и контроль доставки.',
      },
      {
        title: 'Авторский надзор',
        text: 'Контроль соответствия работ проекту, срокам и смете.',
      },
    ],
    advantages: ['Прозрачная смета', 'Контроль сроков', 'Фотоотчеты', 'Кабинет клиента', 'Задачи рабочих', 'Оплаты по этапам'],
    process: ['Заявка', 'Консультация', 'Замер', 'Смета', 'Договор', 'Работы', 'Сдача'],
  };
}

export function createEmptyRepairData(companyName?: string, repairSite?: RepairSiteDraft): RepairData {
  return {
    site: createDefaultRepairSiteSettings(companyName, repairSite),
    clients: [],
    projects: [],
    stages: [],
    tasks: [],
    materials: [],
    payments: [],
    photoReports: [],
    documents: [],
    documentTemplates: createRepairDocumentTemplates(),
    approvals: [],
    chatThreads: [],
    chatMessages: [],
  };
}

export function createGulviraRepairData(owner: User): RepairData {
  const managerId = owner.id;
  const designerId = 'gulvira-designer';
  const foremanId = 'gulvira-foreman';
  const workerId = 'gulvira-worker';

  return {
    site: {
      username: 'gulvira',
      brandName: 'Gulvira Group',
      headline: 'Дизайн и ремонт под ключ',
      subheadline: 'Gulvira Group ведет объект от идеи и дизайн-проекта до ремонта, мебели и сдачи. Клиент видит прогресс, фотоотчеты и оплаты в личном кабинете.',
      cities: ['Шымкент', 'Алматы', 'Астана'],
      phone: '+7 775 669 10 03',
      whatsapp: '+7 775 669 10 03',
      address: 'Шымкент, мкр Туран, 682/1',
      heroImageUrl: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1800&q=85',
      primaryColor: '#17130f',
      accentColor: '#caa146',
      services: [
        {
          title: 'Дизайн интерьера',
          text: 'Планировки, визуализации, чертежи, подбор материалов и мебельные решения.',
        },
        {
          title: 'Ремонт под ключ',
          text: 'Демонтаж, инженерия, черновые и чистовые работы с контролем сроков.',
        },
        {
          title: 'Архитектурное проектирование',
          text: 'Проектирование домов и коммерческих пространств с логикой реализации.',
        },
        {
          title: 'Авторский надзор',
          text: 'Дизайнер и руководитель проекта контролируют соответствие результата проекту.',
        },
        {
          title: 'Комплектация',
          text: 'Мебель, материалы, свет, декор, поставщики и контроль сроков доставки.',
        },
        {
          title: 'Коммерческие помещения',
          text: 'Ремонт салонов, офисов и кафе с учетом запуска бизнеса.',
        },
      ],
      advantages: ['Прозрачная смета', 'Контроль сроков', 'Фотоотчеты', 'Личный кабинет клиента', 'Команда дизайнеров и прорабов', 'Полный цикл работ'],
      process: ['Заявка', 'Консультация', 'Замер', 'Дизайн-проект', 'Смета', 'Ремонт', 'Сдача объекта'],
    },
    clients: [
      {
        id: 'client-aidar',
        name: 'Айдар Нурланов',
        phone: '+7 701 555 10 20',
        whatsapp: '+7 701 555 10 20',
        email: 'aidar@example.kz',
        password: 'client123',
      },
      {
        id: 'client-saule',
        name: 'Сауле Ахметова',
        phone: '+7 707 333 90 12',
        whatsapp: '+7 707 333 90 12',
        email: 'saule@example.kz',
        password: 'client123',
      },
    ],
    projects: [
      {
        id: 'project-atilla',
        title: 'Atilla',
        clientId: 'client-aidar',
        address: 'Шымкент, ул. Байдибек би, 112',
        city: 'Шымкент',
        area: 134,
        objectType: 'коммерческое помещение',
        service: 'дизайн + ремонт',
        status: 'ремонт',
        startDate: '2026-05-05',
        dueDate: '2026-08-15',
        managerId,
        designerId,
        foremanId,
        budget: 28500000,
        paid: 14300000,
        progress: 48,
      },
      {
        id: 'project-avalon',
        title: 'ЖК Авалон',
        clientId: 'client-saule',
        address: 'Алматы, ЖК Авалон, блок B',
        city: 'Алматы',
        area: 94,
        objectType: 'квартира',
        service: 'дизайн-проект',
        status: 'дизайн',
        startDate: '2026-05-20',
        dueDate: '2026-07-20',
        managerId,
        designerId,
        foremanId,
        budget: 9200000,
        paid: 3600000,
        progress: 32,
      },
    ],
    stages: [
      {
        id: 'stage-atilla-1',
        projectId: 'project-atilla',
        title: 'Демонтаж',
        status: 'завершен',
        startDate: '2026-05-05',
        deadline: '2026-05-15',
        responsibleId: foremanId,
        description: 'Демонтаж старых покрытий и подготовка объекта.',
        progress: 100,
        visibleForClient: true,
      },
      {
        id: 'stage-atilla-2',
        projectId: 'project-atilla',
        title: 'Электрика',
        status: 'в работе',
        startDate: '2026-05-16',
        deadline: '2026-06-12',
        responsibleId: foremanId,
        description: 'Разводка по проекту, щитовая и слаботочные линии.',
        progress: 62,
        visibleForClient: true,
      },
      {
        id: 'stage-avalon-1',
        projectId: 'project-avalon',
        title: 'Планировка',
        status: 'на проверке',
        startDate: '2026-05-20',
        deadline: '2026-06-05',
        responsibleId: designerId,
        description: 'Планировочные решения и согласование с клиентом.',
        progress: 80,
        visibleForClient: true,
      },
    ],
    tasks: [
      {
        id: 'task-atilla-electrics',
        projectId: 'project-atilla',
        stageId: 'stage-atilla-2',
        title: 'Проверить точки освещения',
        description: 'Сверить трассы и вывести замечания до закупки чистовых материалов.',
        assigneeId: workerId,
        trade: 'электрик',
        deadline: '2026-06-08',
        status: 'в работе',
        priority: 'высокий',
        location: 'зал и входная группа',
      },
      {
        id: 'task-avalon-plan',
        projectId: 'project-avalon',
        stageId: 'stage-avalon-1',
        title: 'Отправить планировку клиенту',
        description: 'Подготовить PDF и отметить спорные зоны.',
        assigneeId: designerId,
        trade: 'дизайнер',
        deadline: '2026-06-05',
        status: 'на проверке',
        priority: 'средний',
        location: 'проект',
      },
    ],
    materials: [
      {
        id: 'material-atilla-cable',
        projectId: 'project-atilla',
        title: 'Кабель ВВГнг-LS',
        category: 'электрика',
        quantity: '850 м',
        price: 620000,
        supplier: 'ElectroLine',
        status: 'заказано',
      },
      {
        id: 'material-atilla-tile',
        projectId: 'project-atilla',
        title: 'Керамогранит 120x60',
        category: 'чистовая отделка',
        quantity: '145 м²',
        price: 1890000,
        supplier: 'Kerama Market',
        status: 'нужно купить',
      },
    ],
    payments: [
      {
        id: 'payment-atilla-prepay',
        projectId: 'project-atilla',
        amount: 9500000,
        date: '2026-05-05',
        type: 'предоплата',
        status: 'оплачено',
      },
      {
        id: 'payment-atilla-stage',
        projectId: 'project-atilla',
        amount: 4800000,
        date: '2026-05-28',
        type: 'этап',
        status: 'оплачено',
      },
      {
        id: 'payment-avalon-design',
        projectId: 'project-avalon',
        amount: 3600000,
        date: '2026-05-20',
        type: 'предоплата',
        status: 'оплачено',
      },
    ],
    photoReports: [
      {
        id: 'report-atilla-1',
        projectId: 'project-atilla',
        stageId: 'stage-atilla-2',
        title: 'Электрика: трассы по потолку',
        imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
        media: [
          {
            id: 'report-atilla-1-photo',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
            name: 'Электрика потолок',
          },
        ],
        date: '2026-06-03',
        description: 'Основные линии разведены, щитовая зона подготовлена.',
        visibleForClient: true,
      },
    ],
    documents: [
      {
        id: 'doc-atilla-estimate',
        projectId: 'project-atilla',
        stageId: 'stage-atilla-2',
        title: 'Смета Atilla',
        type: 'Смета',
        visibleForClient: true,
        uploadedAt: '2026-05-08',
        content: 'Этапная смета по демонтажу, электрике, черновым и чистовым работам.',
      },
      {
        id: 'doc-avalon-plan',
        projectId: 'project-avalon',
        stageId: 'stage-avalon-1',
        title: 'Планировка ЖК Авалон',
        type: 'PDF',
        visibleForClient: true,
        uploadedAt: '2026-06-02',
        content: 'Планировочное решение для согласования с клиентом.',
      },
    ],
    documentTemplates: createRepairDocumentTemplates(),
    approvals: [
      {
        id: 'approval-atilla-materials',
        projectId: 'project-atilla',
        title: 'Керамогранит для входной группы',
        status: 'ожидает',
        updatedAt: '2026-06-04',
      },
      {
        id: 'approval-avalon-layout',
        projectId: 'project-avalon',
        title: 'Планировка кухни-гостиной',
        status: 'одобрено',
        comment: 'Клиент подтвердил вариант 2.',
        updatedAt: '2026-06-05',
      },
    ],
    chatThreads: [
      {
        id: 'thread-atilla-main',
        projectId: 'project-atilla',
        title: 'Atilla · общий чат',
        memberIds: [managerId, designerId, foremanId, workerId],
        createdBy: managerId,
        createdAt: '2026-06-04T09:00:00.000Z',
      },
      {
        id: 'thread-avalon-design',
        projectId: 'project-avalon',
        title: 'ЖК Авалон · дизайн',
        memberIds: [managerId, designerId],
        createdBy: managerId,
        createdAt: '2026-06-04T09:15:00.000Z',
      },
    ],
    chatMessages: [
      {
        id: 'chat-atilla-1',
        projectId: 'project-atilla',
        threadId: 'thread-atilla-main',
        authorId: foremanId,
        authorName: 'Руслан Омар',
        body: 'Электрика идет по графику, фотоотчет добавлен в кабинет клиента.',
        attachments: [],
        createdAt: '2026-06-04T10:30:00.000Z',
      },
      {
        id: 'chat-atilla-2',
        projectId: 'project-atilla',
        threadId: 'thread-atilla-main',
        authorId: workerId,
        authorName: 'Аскар Электрик',
        body: 'По входной группе осталось проверить две точки освещения.',
        attachments: [],
        createdAt: '2026-06-04T14:10:00.000Z',
      },
    ],
  };
}

export function createGulviraCompanyData(owner: User): CompanyData {
  const designer: TeamMember = {
    id: 'gulvira-designer',
    name: 'Диана Ермек',
    email: 'designer@gulvira.kz',
    phone: '+7 777 100 20 30',
    role: 'designer',
    status: 'active',
  };
  const foreman: TeamMember = {
    id: 'gulvira-foreman',
    name: 'Руслан Омар',
    email: 'foreman@gulvira.kz',
    phone: '+7 701 330 60 77',
    role: 'foreman',
    status: 'active',
  };
  const worker: TeamMember = {
    id: 'gulvira-worker',
    name: 'Аскар Электрик',
    email: 'worker@gulvira.kz',
    phone: '+7 701 550 11 22',
    role: 'worker',
    status: 'active',
  };
  const teamMembers: TeamMember[] = [
    {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      role: owner.role,
      status: 'active',
    },
    designer,
    foreman,
    worker,
  ];

  return {
    ...createCompanyDataForVertical(owner, 'repair', 'Gulvira Group'),
    teamMembers,
    teamGroups: createDefaultTeamGroups(owner.id, teamMembers),
    repair: createGulviraRepairData(owner),
    deals: [
      {
        id: 'deal-atilla',
        title: 'Atilla: дизайн + ремонт',
        clientName: 'Айдар Нурланов',
        phone: '+7 701 555 10 20',
        amount: 28500000,
        stageId: 'project',
        stage: 'negotiation',
        status: 'active',
        assignedTo: owner.id,
        createdAt: '2026-05-05T09:00:00.000Z',
        updatedAt: now(),
        comments: [],
        taskIds: [],
      },
      {
        id: 'deal-avalon',
        title: 'ЖК Авалон: дизайн-проект',
        clientName: 'Сауле Ахметова',
        phone: '+7 707 333 90 12',
        amount: 9200000,
        stageId: 'estimate',
        stage: 'contacted',
        status: 'active',
        assignedTo: owner.id,
        createdAt: '2026-05-20T09:00:00.000Z',
        updatedAt: now(),
        comments: [],
        taskIds: [],
      },
    ],
  };
}

export function createDemoCompanyData(owner: User): CompanyData {
  const manager: TeamMember = {
    id: crypto.randomUUID(),
    name: 'Айгерим Садыкова',
    email: 'aigerim@demo.kz',
    phone: '+7 701 000 22 11',
    role: 'manager',
    status: 'active',
  };

  const firstDeal: Deal = {
    id: crypto.randomUUID(),
    title: 'Ремонт кухни',
    clientName: 'Надия Петрова',
    phone: '+7 701 555 10 20',
    amount: 560000,
    stageId: 'new',
    stage: 'new',
    status: 'active',
    assignedTo: owner.id,
    createdAt: now(),
    updatedAt: now(),
    comments: [],
    taskIds: [],
  };

  const secondDeal: Deal = {
    id: crypto.randomUUID(),
    title: 'Мебель для офиса',
    clientName: 'Тимур Алимов',
    phone: '+7 707 333 90 12',
    amount: 930000,
    stageId: 'contacted',
    stage: 'contacted',
    status: 'active',
    assignedTo: manager.id,
    createdAt: now(),
    updatedAt: now(),
    comments: [],
    taskIds: [],
  };

  const taskId = crypto.randomUUID();
  firstDeal.taskIds = [taskId];

  const teamMembers: TeamMember[] = [
    {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      role: owner.role,
      status: 'active',
      avatarDataUrl: owner.avatarDataUrl,
    },
    manager,
  ];

  return {
    deals: [firstDeal, secondDeal],
    tasks: [
      {
        id: taskId,
        title: 'Отправить каталог',
        description: 'Коротко отправить варианты и цены.',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
        status: 'active',
        assignedTo: owner.id,
        dealId: firstDeal.id,
        createdAt: now(),
      },
    ],
    teamMembers,
    teamGroups: createDefaultTeamGroups(owner.id, teamMembers),
    pipelineStages: createDefaultPipelineStages(),
    pipelineAutomations: createDefaultPipelineAutomations(),
    teamMessages: [],
    roles: createDefaultRoles(),
    settings: createDefaultSettings(),
  };
}
