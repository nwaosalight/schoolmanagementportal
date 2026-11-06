'use client';
import { UnlockPanel } from '@/components/shared/unlock-panel';
import { Alert, PageHeader } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-provider';

export default function ReviewUnlocks() {
  const { role } = useAuth();
  const canDecide = role === 'school_admin' || role === 'exam_officer';
  return (
    <>
      <PageHeader title="Unlock requests" description="Teachers request corrections to approved or published results." />
      {!canDecide && <Alert tone="info" className="mb-4">An administrator or exam officer applies approved unlocks, because reopening a sheet also withdraws the published report cards for that class.</Alert>}
      <UnlockPanel canDecide={canDecide} />
    </>
  );
}
