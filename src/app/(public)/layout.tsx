import { GraduationCap } from 'lucide-react';
import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 via-slate-50 to-slate-50 px-4 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm"><GraduationCap className="h-6 w-6" /></span>
        <span className="text-lg font-semibold text-slate-900">School Results Portal</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-xs text-slate-400">Secure access for staff, parents and students.</p>
    </div>
  );
}
