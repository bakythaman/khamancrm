'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-sm text-neutral-500">Загрузка</div>;
}
