'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { SchoolDataProvider } from '@/lib/school/school-data';
import { AppShell } from '@/components/layout/app-shell';
import { Button, EmptyState, PageLoader } from '@/components/ui';
import { UserX } from 'lucide-react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { fbUser, profile, actor, loading, signOutUser } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!fbUser) router.replace('/login');
    else if (profile?.mustChangePassword) router.replace('/first-login');
  }, [loading, fbUser, profile, router]);

  if (loading || !fbUser) return <PageLoader label="Loading your workspace…" />;
  if (!profile || !actor || profile.status !== 'ACTIVE') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <EmptyState icon={<UserX className="h-6 w-6" />} title={profile ? 'Your account is deactivated' : 'Your account is not set up yet'}
          description="Please contact your school administrator."
          action={<Button variant="secondary" onClick={async () => { await signOutUser(); router.replace('/login'); }}>Sign out</Button>} />
      </div>
    );
  }
  if (profile.mustChangePassword) return <PageLoader />;
  return <SchoolDataProvider><AppShell>{children}</AppShell></SchoolDataProvider>;
}
