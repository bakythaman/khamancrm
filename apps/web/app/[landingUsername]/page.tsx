import { RepairLandingPage } from '@/components/repair/landing-page';

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ landingUsername: 'gulvira' }];
}

export default async function LandingUsernamePage({ params }: { params: Promise<{ landingUsername: string }> }) {
  const { landingUsername } = await params;
  return <RepairLandingPage routeUsername={landingUsername} />;
}
