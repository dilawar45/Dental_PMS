'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from '@dental-pms/types';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldAlert,
  Sliders,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface PlatformShellProps {
  user: User;
  children: React.ReactNode;
}

const PLATFORM_NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/platform/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Clinics',
    href: '/platform/clinics',
    icon: Building2,
  },
  {
    label: 'Platform Users',
    href: '/platform/users',
    icon: Users,
  },
  {
    label: 'Platform Audit',
    href: '/platform/audit',
    icon: ShieldAlert,
  },
  {
    label: 'Settings',
    href: '/platform/settings',
    icon: Sliders,
  },
];

export function PlatformShell({ user, children }: PlatformShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/platform/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black shadow-lg shadow-indigo-500/20">
              ⚡
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">
                  DentalPMS
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest">
                  PLATFORM
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Super-Admin Console</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="font-medium text-slate-300">{user.email}</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-600 text-white">
              Super-Admin
            </span>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col border-r border-slate-800/80 bg-slate-900/60 p-4 shrink-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Platform Management
          </div>
          <nav className="space-y-1">
            {PLATFORM_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/platform/dashboard'
                  ? pathname === '/platform/dashboard'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-60" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 px-3 space-y-1">
            <div className="flex items-center justify-between">
              <span>Environment</span>
              <span className="text-emerald-400 font-mono">Development</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Security Boundary</span>
              <span className="text-indigo-400 font-mono">DB Session</span>
            </div>
          </div>
        </aside>

        {/* Mobile Flyout Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex w-full max-w-xs flex-col bg-slate-900 p-4 text-slate-100 shadow-2xl">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">Platform Admin</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {PLATFORM_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/platform/dashboard'
                      ? pathname === '/platform/dashboard'
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
