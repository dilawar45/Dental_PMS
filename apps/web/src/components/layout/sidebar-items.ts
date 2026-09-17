import type { UserRole } from '@dental-pms/types';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Inbox,
  Receipt,
  Settings,
  ShieldCheck,
  Building2,
  ScrollText,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['owner', 'dentist', 'receptionist', 'assistant'],
  },
  {
    title: 'Patients',
    href: '/patients',
    icon: Users,
    roles: ['owner', 'dentist', 'receptionist', 'assistant'],
  },
  {
    title: 'Appointments',
    href: '/appointments',
    icon: Calendar,
    roles: ['owner', 'dentist', 'receptionist', 'assistant'],
  },
  {
    title: 'Booking Queue',
    href: '/bookings',
    icon: Inbox,
    roles: ['owner', 'receptionist'],
  },
  {
    title: 'Invoices',
    href: '/invoices',
    icon: Receipt,
    roles: ['owner', 'receptionist'],
  },
  {
    title: 'Simulator',
    href: '/simulator',
    icon: PlayCircle,
    roles: ['owner', 'receptionist'],
  },
];

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  {
    title: 'Clinic Settings',
    href: '/settings/clinic',
    icon: Building2,
    roles: ['owner'],
  },
  {
    title: 'Staff & Users',
    href: '/settings/users',
    icon: ShieldCheck,
    roles: ['owner'],
  },
  {
    title: 'Audit Log',
    href: '/audit',
    icon: ScrollText,
    roles: ['owner'],
  },
];
