import { MessageSquare, Phone, Camera, Share2, Globe, Sparkles, type LucideIcon } from 'lucide-react';

export interface ChannelBadgeInfo {
  label: string;
  color: string;
  icon: LucideIcon;
}

export function getChannelBadge(channel: string): ChannelBadgeInfo {
  switch (channel) {
    case 'whatsapp':
      return {
        label: 'WhatsApp',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        icon: MessageSquare,
      };
    case 'voice':
      return {
        label: 'AI Voice Agent',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
        icon: Phone,
      };
    case 'instagram':
      return {
        label: 'Instagram',
        color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800',
        icon: Camera,
      };
    case 'facebook':
      return {
        label: 'Facebook',
        color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        icon: Share2,
      };
    case 'google':
      return {
        label: 'Google Profile',
        color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        icon: Globe,
      };
    default:
      return {
        label: channel,
        color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
        icon: Sparkles,
      };
  }
}
