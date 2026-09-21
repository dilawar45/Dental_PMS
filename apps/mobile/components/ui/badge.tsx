import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { statusColors, invoiceStatusColors } from '../../constants/theme';

interface BadgeProps extends ViewProps {
  status?: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'slate';
  children?: React.ReactNode;
}

export function Badge({
  status,
  label,
  variant,
  children,
  className,
  ...props
}: BadgeProps) {
  if (status) {
    const key = status.toLowerCase();
    const config = statusColors[key] || invoiceStatusColors[key];
    if (config) {
      const fallbackColorMap: Record<string, { bg: string; border: string; text: string }> = {
        confirmed: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
        pending: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
        cancelled: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
        completed: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
        paid: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
        draft: { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },
      };
      const fb = fallbackColorMap[key] || { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' };

      return (
        <View
          className={twMerge(
            clsx(
              'flex-row items-center px-2.5 py-0.5 rounded-full border',
              config.bg,
              config.border,
              className
            )
          )}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
              borderWidth: 1,
              backgroundColor: fb.bg,
              borderColor: fb.border,
            },
            props.style,
          ]}
          {...props}
        >
          <Text
            className={clsx('text-xs font-semibold capitalize', config.text)}
            style={{ fontSize: 11, fontWeight: '700', color: fb.text, textTransform: 'capitalize' }}
          >
            {label || config.label || status}
          </Text>
        </View>
      );
    }
  }

  const variantStyles = {
    primary: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    secondary: 'bg-slate-100 border-slate-200 text-slate-700',
    outline: 'border-slate-300 bg-white text-slate-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-600',
  }[variant || 'primary'];

  return (
    <View
      className={twMerge(
        clsx(
          'flex-row items-center px-2.5 py-0.5 rounded-full border',
          variantStyles,
          className
        )
      )}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className="text-xs font-semibold">{children}</Text>
      ) : (
        children || (label ? <Text className="text-xs font-semibold">{label}</Text> : null)
      )}
    </View>
  );
}
