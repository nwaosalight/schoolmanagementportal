'use client';
import { CrudManager } from '@/components/shared/crud-manager';
import { PageHeader } from '@/components/ui';
export default function FlagsPage() {
  return (<><PageHeader title="Feature flags" description="Switch platform features on or off." />
    <CrudManager global path="featureFlags" singular="Flag" fields={[
      { name: 'key', label: 'Key', type: 'text', required: true, placeholder: 'result-checker' }, { name: 'description', label: 'Description', type: 'text' }, { name: 'enabled', label: 'Enabled', type: 'checkbox' }]} /></>);
}
