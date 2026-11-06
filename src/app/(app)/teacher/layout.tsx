import type { ReactNode } from 'react';
import { RequireRole } from '@/components/layout/require-role';
export default function Layout({ children }: { children: ReactNode }) {
  return <RequireRole roles={['teacher']}>{children}</RequireRole>;
}
