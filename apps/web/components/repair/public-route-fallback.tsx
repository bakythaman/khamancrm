'use client';

import { usePathname } from 'next/navigation';
import RepairClientPortalPage from '@/app/client/page';
import { RepairLandingPage } from '@/components/repair/landing-page';

function usernameFromPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const clientIndex = parts.lastIndexOf('client');

  if (clientIndex > 0) {
    const username = parts[clientIndex - 1];
    return !username || username === 'khamancrm' ? undefined : decodeURIComponent(username);
  }

  const candidate = parts.at(-1);
  if (!candidate || ['client', 'site', 'khamancrm'].includes(candidate)) return undefined;
  return decodeURIComponent(candidate);
}

export function PublicRouteFallback() {
  const pathname = usePathname();
  const username = usernameFromPath(pathname);

  if (pathname.split('/').filter(Boolean).at(-1) === 'client') {
    return <RepairClientPortalPage />;
  }

  return <RepairLandingPage routeUsername={username} />;
}
