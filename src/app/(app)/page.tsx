'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { ROLE_HOME } from '@/config/routes';
import { PageLoader } from '@/components/ui';

export default function Home() {
  const { role } = useAuth();
  const router = useRouter();
  useEffect(() => { if (role) router.replace(ROLE_HOME[role]); }, [role, router]);
  return <PageLoader />;
}
