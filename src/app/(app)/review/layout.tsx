import type { ReactNode } from 'react';
import { RequireRole } from '@/components/layout/require-role';
export default function Layout({ children }: { children: ReactNode }) {
  return <RequireRole roles={['principal', 'hod', 'school_admin', 'exam_officer']}>{children}</RequireRole>;
}
