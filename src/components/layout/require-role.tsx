'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-provider';
import { EmptyState, PageLoader } from '@/components/ui';
import { ROLE_HOME } from '@/config/routes';
import type { Role } from '@/types';

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!role || !roles.includes(role)) {
    return (
      <EmptyState icon={<ShieldAlert className="h-6 w-6" />} title="You don't have access to this page"
        description="Your current role can't open this area. Switch role from the top bar, or go back to your home page."
        action={<Link href={role ? ROLE_HOME[role] : '/login'} className="btn btn-md btn-primary">Go to my home</Link>} />
    );
  }
  return <>{children}</>;
}
