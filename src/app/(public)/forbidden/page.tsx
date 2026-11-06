import Link from 'next/link';
import { Card } from '@/components/ui';
export default function Forbidden() {
  return (
    <Card className="p-7 text-center">
      <p className="text-4xl font-semibold text-brand-600">403</p>
      <h1 className="mt-2 text-xl font-semibold">Access denied</h1>
      <p className="mt-1 text-sm text-slate-500">You don't have permission to view that page.</p>
      <Link href="/" className="btn btn-md btn-primary mt-5">Go home</Link>
    </Card>
  );
}
