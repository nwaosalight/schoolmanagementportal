import type { Role } from '@/types';
export const ROLE_HOME: Record<Role, string> = {
  platform: '/platform',
  school_admin: '/admin',
  exam_officer: '/admin',
  principal: '/review',
  hod: '/review',
  teacher: '/teacher',
  parent: '/parent',
  student: '/student',
};
export const ROLE_LABEL: Record<Role, string> = {
  platform: 'Platform admin',
  school_admin: 'School admin',
  exam_officer: 'Exam officer',
  principal: 'Principal',
  hod: 'Head of department',
  teacher: 'Teacher',
  parent: 'Parent / Guardian',
  student: 'Student',
};
export const STAFF_ROLES = ['school_admin', 'exam_officer', 'principal', 'hod', 'teacher'] as const;
