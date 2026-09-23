import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftAddon?: string;
  rightElement?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  helperText,
  leftAddon,
  rightElement,
  containerStyle,
  className,
  style,
  ...props
}: InputProps) {
  return (
    <View
      className="w-full mb-4"
      style={[{ width: '100%', marginBottom: 16 }, containerStyle]}
    >
      {label ? (
        <Text
          className="text-sm font-semibold text-slate-700 mb-1.5"
          style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 }}
        >
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
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderWidth: 1.5,
          borderColor: error ? '#ef4444' : '#cbd5e1',
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 8,
          minHeight: 48,
        }}
      >
        {leftAddon ? (
          <Text
            className="text-slate-500 font-semibold mr-2 border-r border-slate-200 pr-2"
            style={{
              color: '#64748b',
              fontWeight: '600',
              marginRight: 8,
              paddingRight: 8,
              borderRightWidth: 1,
              borderRightColor: '#e2e8f0',
              fontSize: 15,
            }}
          >
            {leftAddon}
          </Text>
        ) : null}

        <TextInput
          placeholderTextColor="#94a3b8"
          className="flex-1 text-base text-slate-900"
          style={[
            {
              flex: 1,
              fontSize: 15,
              color: '#0f172a',
              paddingVertical: 2,
              paddingHorizontal: 0,
            },
            style,
          ]}
          {...props}
        />

        {rightElement ? (
          <View style={{ marginLeft: 8, justifyContent: 'center' }}>
            {rightElement}
          </View>
        ) : null}
      </View>

      {error ? (
        <Text
          className="text-xs text-red-600 mt-1"
          style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          className="text-xs text-slate-500 mt-1"
          style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}
