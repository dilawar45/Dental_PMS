import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { statusColors } from '../../constants/theme';

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
  if (status && statusColors[status.toLowerCase()]) {
    const config = statusColors[status.toLowerCase()]!;
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
        {...props}
      >
        <Text className={clsx('text-xs font-semibold capitalize', config.text)}>
          {label || config.label || status}
        </Text>
      </View>
    );
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
