import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
} from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftAddon?: string;
}

export function Input({
  label,
  error,
  helperText,
  leftAddon,
  className,
  ...props
}: InputProps) {
  return (
    <View className="w-full mb-4">
      {label ? (
        <Text className="text-sm font-semibold text-slate-700 mb-1.5">
          {label}
        </Text>
      ) : null}

      <View
        className={twMerge(
          clsx(
            'flex-row items-center bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-emerald-600',
            error && 'border-red-500',
            className
          )
        )}
      >
        {leftAddon ? (
          <Text className="text-slate-500 font-semibold mr-2 border-r border-slate-200 pr-2">
            {leftAddon}
          </Text>
        ) : null}
        <TextInput
          placeholderTextColor="#94a3b8"
          className="flex-1 text-base text-slate-900"
          {...props}
        />
      </View>

      {error ? (
        <Text className="text-xs text-red-600 mt-1">{error}</Text>
      ) : helperText ? (
        <Text className="text-xs text-slate-500 mt-1">{helperText}</Text>
      ) : null}
    </View>
  );
}
