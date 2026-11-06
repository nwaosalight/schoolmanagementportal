'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui';
import { StudentForm } from '@/components/shared/student-form';

export default function NewStudentPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader back={<Link href="/admin/students" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Students</Link>} title="Add student" description="You can link guardians and create a login after saving." />
      <Card className="max-w-3xl p-6"><StudentForm onSaved={(id) => router.push(`/admin/students/${id}`)} /></Card>
    </>
  );
}
