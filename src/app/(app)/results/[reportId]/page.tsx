'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-provider';
import { PageLoader } from '@/components/ui';

/** Deep-link target used by notifications: routes to the right report view for the signed-in role. */
export default function ResultRedirect() {
  const { reportId } = useParams<{ reportId: string }>();
  const { role } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!role) return;
    const [termId, studentId] = String(reportId).split('_');
    if (role === 'parent') router.replace(`/parent/children/${studentId}/results/${termId}`);
    else if (role === 'student') router.replace(`/student/results/${termId}`);
    else router.replace('/admin/broadsheet');
  }, [role, reportId, router]);
  return <PageLoader />;
}
