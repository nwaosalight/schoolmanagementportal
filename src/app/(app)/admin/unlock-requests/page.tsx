'use client';
import { UnlockPanel } from '@/components/shared/unlock-panel';
import { PageHeader } from '@/components/ui';
export default function UnlockRequestsPage() {
  return (<><PageHeader title="Unlock requests" description="Corrections to locked or published results need an approved, audited unlock." /><UnlockPanel canDecide /></>);
}
