import {
  Award, BarChart3, BookOpen, Calculator, CalendarDays, ClipboardCheck, ClipboardList, FileText, GraduationCap, History, Home,
  Layers, LayoutDashboard, LifeBuoy, LineChart, MessageSquare, Palette, Send, Settings, ShieldCheck, SlidersHorizontal,
  Table2, Unlock, UserCog, Users, School, Flag, CreditCard, UserCheck, type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem { label: string; href: string; icon: LucideIcon; exact?: boolean }
export interface NavGroup { title?: string; items: NavItem[] }

export const NAV: Record<Role, NavGroup[]> = {
  school_admin: [], exam_officer: [], // filled below (shared)
  principal: [], hod: [],
  teacher: [{ items: [
    { label: 'Dashboard', href: '/teacher', icon: LayoutDashboard, exact: true },
    { label: 'My result sheets', href: '/teacher/sheets', icon: ClipboardList },
  ] }],
  parent: [{ items: [
    { label: 'My children', href: '/parent', icon: Home, exact: true },
  ] }],
  student: [{ items: [
    { label: 'Dashboard', href: '/student', icon: LayoutDashboard, exact: true },
    { label: 'My results', href: '/student/results', icon: FileText },
    { label: 'Insights', href: '/student/insights', icon: LineChart },
  ] }],
  platform: [{ items: [
    { label: 'Schools', href: '/platform', icon: School, exact: true },
    { label: 'Plans', href: '/platform/plans', icon: CreditCard },
    { label: 'Feature flags', href: '/platform/feature-flags', icon: Flag },
  ] }],
};

const ADMIN: NavGroup[] = [
  { items: [{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true }] },
  { title: 'Results', items: [
    { label: 'Submission tracker', href: '/admin/tracker', icon: ClipboardCheck },
    { label: 'Computation', href: '/admin/computation', icon: Calculator },
    { label: 'Broadsheet', href: '/admin/broadsheet', icon: Table2 },
    { label: 'Publish centre', href: '/admin/publish', icon: Send },
    { label: 'Result queries', href: '/admin/queries', icon: MessageSquare },
    { label: 'Unlock requests', href: '/admin/unlock-requests', icon: Unlock },
  ] },
  { title: 'People', items: [
    { label: 'Students', href: '/admin/students', icon: GraduationCap },
    { label: 'Parents / guardians', href: '/admin/guardians', icon: UserCheck },
    { label: 'Users & staff', href: '/admin/users', icon: Users },
    { label: 'Teacher allocation', href: '/admin/allocations', icon: UserCog },
  ] },
  { title: 'Setup', items: [
    { label: 'School profile', href: '/admin/school', icon: School },
    { label: 'Sessions & terms', href: '/admin/calendar', icon: CalendarDays },
    { label: 'Classes', href: '/admin/classes', icon: Layers },
    { label: 'Subjects', href: '/admin/subjects', icon: BookOpen },
    { label: 'Grading', href: '/admin/grading', icon: Award },
    { label: 'Assessment', href: '/admin/assessment', icon: SlidersHorizontal },
    { label: 'Report cards', href: '/admin/report-templates', icon: Palette },
  ] },
  { title: 'System', items: [
    { label: 'Audit log', href: '/admin/audit-log', icon: History },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ] },
];
const REVIEW: NavGroup[] = [{ items: [
  { label: 'Review queue', href: '/review', icon: ShieldCheck, exact: true },
  { label: 'Principal remarks', href: '/review/remarks', icon: MessageSquare },
  { label: 'Analytics', href: '/review/analytics', icon: BarChart3 },
  { label: 'Unlock requests', href: '/review/unlock-requests', icon: Unlock },
] }];
NAV.school_admin = ADMIN; NAV.exam_officer = ADMIN; NAV.principal = REVIEW; NAV.hod = REVIEW;
export const SUPPORT_ICON = LifeBuoy;
