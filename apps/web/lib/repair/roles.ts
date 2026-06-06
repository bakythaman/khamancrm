import type { Company, User } from '@/lib/storage/types';

export const repairPortalRoles = ['designer', 'foreman', 'worker'] as const;

export function isRepairPortalRole(role: string | undefined) {
  return repairPortalRoles.includes(role as (typeof repairPortalRoles)[number]);
}

export function shouldOpenRepairPortal(user: User | null | undefined, company: Company | null | undefined) {
  return company?.vertical === 'repair' && isRepairPortalRole(user?.role);
}

export function landingPathForUser(user: User | null | undefined, company: Company | null | undefined) {
  return shouldOpenRepairPortal(user, company) ? '/repair' : '/dashboard';
}
