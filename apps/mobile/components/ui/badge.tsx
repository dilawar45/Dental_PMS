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

  const variantFallbacks = {
    primary: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
    secondary: { bg: '#f1f5f9', border: '#e2e8f0', text: '#334155' },
    outline: { bg: '#ffffff', border: '#cbd5e1', text: '#334155' },
    slate: { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },
  }[variant || 'primary'];

  return (
    <View
      className={twMerge(
        clsx(
          'flex-row items-center px-2.5 py-0.5 rounded-full border',
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
          backgroundColor: variantFallbacks.bg,
          borderColor: variantFallbacks.border,
        },
        props.style,
      ]}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text style={{ fontSize: 11, fontWeight: '700', color: variantFallbacks.text }}>
          {children}
        </Text>
      ) : label ? (
        <Text style={{ fontSize: 11, fontWeight: '700', color: variantFallbacks.text }}>
          {label}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
