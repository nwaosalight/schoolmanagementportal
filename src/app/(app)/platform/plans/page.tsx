'use client';
import { CrudManager } from '@/components/shared/crud-manager';
import { PageHeader } from '@/components/ui';
export default function PlansPage() {
  return (<><PageHeader title="Plans" description="Subscription plans offered to schools." />
    <CrudManager global path="plans" singular="Plan" fields={[
      { name: 'name', label: 'Plan name', type: 'text', required: true }, { name: 'price', label: 'Price per term', type: 'number', required: true },
      { name: 'currency', label: 'Currency', type: 'text', default: 'NGN' }, { name: 'maxStudents', label: 'Max students', type: 'number' }, { name: 'active', label: 'Active', type: 'checkbox', default: true }]} /></>);
}
