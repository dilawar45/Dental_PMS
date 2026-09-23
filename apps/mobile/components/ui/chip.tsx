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
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 12,
          borderWidth: 1.5,
          marginRight: 8,
          marginBottom: 8,
          backgroundColor: selected ? '#059669' : '#ffffff',
          borderColor: selected ? '#059669' : '#e2e8f0',
        },
        props.style,
      ]}
      {...props}
    >
      {icon ? <Text style={{ marginRight: 6 }}>{icon}</Text> : null}
      <Text
        className={clsx(
          'text-xs font-semibold',
          selected ? 'text-white' : 'text-slate-700'
        )}
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: selected ? '#ffffff' : '#334155',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
