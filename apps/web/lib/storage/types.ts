export type Language = 'ru' | 'kz';

export type CompanyVertical = 'sales' | 'repair';

export type UserRole = string;

export type TeamStatus = 'active' | 'inactive' | 'invited';

export type DealStage = 'new' | 'contacted' | 'negotiation' | 'won' | 'lost';

export type DealStatus = 'active' | 'won' | 'lost';

export type TaskStatus = 'active' | 'done';

export type Permission =
  | 'view_dashboard'
  | 'view_pipeline'
  | 'create_deal'
  | 'edit_deal'
  | 'delete_deal'
  | 'view_tasks'
  | 'create_task'
  | 'edit_task'
  | 'delete_task'
  | 'view_analytics'
  | 'export_analytics'
  | 'view_admin'
  | 'view_team'
  | 'manage_team'
  | 'view_settings'
  | 'manage_settings'
  | 'manage_roles'
  | 'manage_pipeline';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  companyId: string;
  language: Language;
  passwordHash: string;
  active?: boolean;
  avatarDataUrl?: string;
}

export interface Company {
  id: string;
  name: string;
  vertical: CompanyVertical;
  createdAt: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  createdAt: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  permissions: Permission[];
  isDefault: boolean;
  createdAt: string;
}

export interface CompanySettings {
  notificationsEnabled: boolean;
  notificationPermission?: NotificationPermission | 'unsupported';
  logoDataUrl?: string;
  automation: boolean[];
}

export type PipelineAutomationType = 'robot' | 'trigger' | 'broadcast';

export interface PipelineAutomation {
  id: string;
  type: PipelineAutomationType;
  name: string;
  stageId: string;
  message: string;
  enabled: boolean;
  createdAt: string;
}

export interface DealComment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  title: string;
  clientName: string;
  phone: string;
  amount: number;
  stageId: string;
  stage?: DealStage;
  status: DealStatus;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  comments: DealComment[];
  taskIds: string[];
}

export interface CrmTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  assignedTo: string;
  dealId?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: TeamStatus;
  avatarDataUrl?: string;
  isOnline?: boolean;
  lastLoginAt?: string;
  lastLogoutAt?: string;
  lastSeenAt?: string;
  loginCount?: number;
  logoutCount?: number;
}

export interface TeamGroup {
  id: string;
  name: string;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
  isDefault?: boolean;
}

export interface TeamMessage {
  id: string;
  groupId: string;
  authorId: string;
  text: string;
  taskId?: string;
  createdAt: string;
}

export interface CompanyData {
  deals: Deal[];
  tasks: CrmTask[];
  teamMembers: TeamMember[];
  teamGroups: TeamGroup[];
  pipelineStages: PipelineStage[];
  pipelineAutomations: PipelineAutomation[];
  teamMessages: TeamMessage[];
  roles: RoleDefinition[];
  settings: CompanySettings;
  repair?: RepairData;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  companyVertical: CompanyVertical;
  repairSite?: RepairSiteDraft;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface DealPayload {
  title: string;
  clientName: string;
  phone: string;
  amount: number;
  stageId: string;
  status: DealStatus;
  assignedTo: string;
}

export interface TaskPayload {
  title: string;
  description: string;
  dueDate: string;
  assignedTo: string;
  dealId?: string;
}

export interface TeamMemberPayload {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  password?: string;
  confirmPassword?: string;
  avatarDataUrl?: string;
}

export type RepairProjectStatus = 'новый' | 'дизайн' | 'ремонт' | 'сдача' | 'завершен';
export type RepairStageStatus = 'не начат' | 'в работе' | 'на проверке' | 'завершен';
export type RepairTaskStatus = 'новая' | 'в работе' | 'на проверке' | 'завершена';
export type RepairPaymentStatus = 'ожидается' | 'оплачено';
export type RepairMaterialStatus = 'нужно купить' | 'заказано' | 'доставлено' | 'оплачено';

export interface RepairClient {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
}

export interface RepairSiteService {
  title: string;
  text: string;
}

export interface RepairSiteSettings {
  username: string;
  brandName: string;
  headline: string;
  subheadline: string;
  cities: string[];
  phone: string;
  whatsapp: string;
  address: string;
  heroImageUrl: string;
  primaryColor: string;
  accentColor: string;
  services: RepairSiteService[];
  advantages: string[];
  process: string[];
}

export interface RepairSiteDraft {
  username?: string;
  brandName?: string;
  headline?: string;
  subheadline?: string;
  cities?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  heroImageUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  servicesText?: string;
}

export interface RepairProject {
  id: string;
  title: string;
  clientId: string;
  address: string;
  city: string;
  area: number;
  objectType: string;
  service: string;
  status: RepairProjectStatus;
  startDate: string;
  dueDate: string;
  managerId: string;
  designerId: string;
  foremanId: string;
  budget: number;
  paid: number;
  progress: number;
}

export interface RepairStage {
  id: string;
  projectId: string;
  title: string;
  status: RepairStageStatus;
  startDate: string;
  deadline: string;
  responsibleId: string;
  description: string;
  progress: number;
  visibleForClient: boolean;
}

export interface RepairTask {
  id: string;
  projectId: string;
  stageId: string;
  title: string;
  description: string;
  assigneeId: string;
  trade: string;
  deadline: string;
  status: RepairTaskStatus;
  priority: 'низкий' | 'средний' | 'высокий';
  location: string;
}

export interface RepairMaterial {
  id: string;
  projectId: string;
  title: string;
  category: string;
  quantity: string;
  price: number;
  supplier: string;
  status: RepairMaterialStatus;
}

export interface RepairPayment {
  id: string;
  projectId: string;
  amount: number;
  date: string;
  type: 'предоплата' | 'этап' | 'финальный платеж';
  status: RepairPaymentStatus;
}

export interface RepairPhotoReport {
  id: string;
  projectId: string;
  stageId: string;
  title: string;
  imageUrl?: string;
  media?: RepairReportMedia[];
  date: string;
  description: string;
  visibleForClient: boolean;
}

export interface RepairReportMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  name?: string;
}

export interface RepairDocument {
  id: string;
  projectId: string;
  stageId?: string;
  title: string;
  type: string;
  visibleForClient: boolean;
  uploadedAt: string;
  content?: string;
}

export interface RepairDocumentTemplate {
  id: string;
  title: string;
  type: string;
  fields: string[];
  body: string;
}

export interface RepairApproval {
  id: string;
  projectId: string;
  title: string;
  status: 'ожидает' | 'одобрено' | 'нужны правки' | 'вопрос';
  comment?: string;
  updatedAt: string;
}

export interface RepairChatMessage {
  id: string;
  projectId: string;
  threadId?: string;
  authorId: string;
  authorName: string;
  body: string;
  attachments?: RepairChatAttachment[];
  createdAt: string;
}

export interface RepairChatAttachment {
  id: string;
  type: 'image' | 'document';
  name: string;
  url: string;
  createdAt: string;
}

export interface RepairChatThread {
  id: string;
  projectId: string;
  title: string;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
}

export interface RepairData {
  site: RepairSiteSettings;
  clients: RepairClient[];
  projects: RepairProject[];
  stages: RepairStage[];
  tasks: RepairTask[];
  materials: RepairMaterial[];
  payments: RepairPayment[];
  photoReports: RepairPhotoReport[];
  documents: RepairDocument[];
  documentTemplates: RepairDocumentTemplate[];
  approvals: RepairApproval[];
  chatThreads: RepairChatThread[];
  chatMessages: RepairChatMessage[];
}
