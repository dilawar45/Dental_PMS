'use client';

import { useTransition, useState, useEffect } from 'react';
import { exitSupportModeAction } from '@/lib/auth/support-actions';

interface SupportModeBannerProps {
  clinicName: string;
  superAdminEmail: string;
  impersonatedName: string;
  expiresAt: number;
}

export function SupportModeBanner({
  clinicName,
  superAdminEmail,
  impersonatedName,
  expiresAt,
}: SupportModeBannerProps) {
  const [isPending, startTransition] = useTransition();
  const [minutesLeft, setMinutesLeft] = useState<number>(() =>
    Math.max(0, Math.round((expiresAt - Date.now()) / 60000))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 60000));
      setMinutesLeft(left);
      if (left <= 0) {
        // Auto exit on expiration
        startTransition(() => {
          void exitSupportModeAction();
        });
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <div
      id="support-mode-banner"
      className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between text-xs sm:text-sm font-medium border-b border-amber-400 z-50 sticky top-0"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
        </span>
        <span className="font-bold tracking-wider uppercase px-1.5 py-0.5 bg-black text-amber-400 rounded text-[10px]">
          SUPPORT MODE
        </span>
        <span>
          Viewing <strong>{clinicName}</strong> as <strong>{impersonatedName}</strong>. Real actor: <em>{superAdminEmail}</em>.
        </span>
        <span className="text-amber-950 font-semibold ml-2">
          (Expires in ~{minutesLeft}m)
        </span>
      </div>

      <div className="flex items-center gap-3 mt-1 sm:mt-0">
        <span className="text-[11px] text-amber-950 hidden md:inline">
          Destructive clinic operations are blocked. All actions are audited.
        </span>
        <button
          id="exit-support-mode-btn"
          disabled={isPending}
          onClick={() => {
            startTransition(() => {
              void exitSupportModeAction();
            });
          }}
          className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-amber-400 rounded font-semibold text-xs transition shadow hover:shadow-md cursor-pointer disabled:opacity-50"
        >
          {isPending ? 'Exiting...' : 'Exit Support Mode'}
        </button>
      </div>
    </div>
  );
}
