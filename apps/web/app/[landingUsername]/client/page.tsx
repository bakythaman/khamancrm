import RepairClientPortalPage from '@/app/client/page';

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ landingUsername: 'gulvira' }];
}

export default function LandingClientPage() {
  return <RepairClientPortalPage />;
}
