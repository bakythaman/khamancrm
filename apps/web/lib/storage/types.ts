export type Language = 'ru' | 'kz';

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
}

export interface Company {
  id: string;
  name: string;
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
}

export interface CompanyData {
  deals: Deal[];
  tasks: CrmTask[];
  teamMembers: TeamMember[];
  pipelineStages: PipelineStage[];
  roles: RoleDefinition[];
  settings: CompanySettings;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  companyName: string;
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
}
