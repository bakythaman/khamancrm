export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'VIEWER';

export type DealStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';

export type TaskStatus = 'OPEN' | 'DONE' | 'OVERDUE';

export type ConversationStatus = 'OPEN' | 'WAITING' | 'RESOLVED';

export interface CrmUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  company?: string;
  source: 'WHATSAPP' | 'PHONE' | 'WEBSITE' | 'REFERRAL' | 'MANUAL';
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  contact: Contact;
  owner: CrmUser;
  nextStep?: string;
  updatedAt: string;
}

export interface InboxConversation {
  id: string;
  contact: Contact;
  status: ConversationStatus;
  owner?: CrmUser;
  tags: string[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface CrmTask {
  id: string;
  title: string;
  dueAt: string;
  status: TaskStatus;
  owner: CrmUser;
  dealId?: string;
  contactName?: string;
}
