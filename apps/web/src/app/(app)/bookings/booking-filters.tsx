'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Filter, MessageSquare, Phone, Camera, Share2, Globe, Sparkles } from 'lucide-react';

interface BookingFiltersProps {
  selectedChannel?: string;
}

export function BookingFilters({ selectedChannel }: BookingFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChannelChange = (channel: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (channel) {
      params.set('channel', channel);
    } else {
      params.delete('channel');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Filter Channel:
        </span>
        <select
          value={selectedChannel || ''}
          onChange={(e) => handleChannelChange(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Omnichannel Inquiries</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="voice">AI Voice Call</option>
          <option value="instagram">Instagram DM</option>
          <option value="facebook">Facebook Messenger</option>
          <option value="google">Google Business</option>
          <option value="staff">Staff Intake</option>
        </select>
      </div>

      <div className="text-xs text-slate-400 font-medium">
        Sorted FIFO (Oldest inquiries first)
      </div>
    </div>
  );
}

export { getChannelBadge } from './channel-badge';

