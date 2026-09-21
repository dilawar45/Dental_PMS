import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ChipProps extends TouchableOpacityProps {
  label: string;
  selected?: boolean;
  icon?: React.ReactNode;
}

export function Chip({
  label,
  selected = false,
  icon,
  className,
  ...props
}: ChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      className={twMerge(
        clsx(
          'flex-row items-center px-3.5 py-2 rounded-xl border transition-colors mr-2 mb-2',
          selected
            ? 'bg-emerald-600 border-emerald-600'
            : 'bg-white border-slate-200 active:bg-slate-50',
          className
        )
      )}
      {...props}
    >
      {icon ? <Text className="mr-1.5">{icon}</Text> : null}
      <Text
        className={clsx(
          'text-xs font-semibold',
          selected ? 'text-white' : 'text-slate-700'
        )}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
