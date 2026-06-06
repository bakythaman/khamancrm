import type { User } from '@/lib/storage/types';

const fallbackAdminEmails = ['khaman.crm@gmail.com'];

function configuredAdminEmails() {
  return (process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS ?? fallbackAdminEmails.join(','))
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(user: User | null | undefined) {
  if (!user) return false;
  return configuredAdminEmails().includes(user.email.trim().toLowerCase());
}
