import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends TouchableOpacityProps {
  title?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  title,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  className,
  ...props
}: ButtonProps) {
  const baseButtonStyles =
    'flex-row items-center justify-center rounded-xl font-medium transition-opacity';

  const variantStyles = {
    primary: 'bg-emerald-600 active:bg-emerald-700',
    secondary: 'bg-slate-100 active:bg-slate-200',
    outline: 'border border-slate-300 bg-white active:bg-slate-50',
    ghost: 'bg-transparent active:bg-slate-100',
    danger: 'bg-red-600 active:bg-red-700',
  }[variant];

  const sizeStyles = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3.5',
    lg: 'px-6 py-4',
  }[size];

  const textVariantStyles = {
    primary: 'text-white font-semibold',
    secondary: 'text-slate-800 font-medium',
    outline: 'text-slate-700 font-medium',
    ghost: 'text-slate-700 font-medium',
    danger: 'text-white font-semibold',
  }[variant];

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }[size];

  const isDisabled = disabled || loading;

  const buttonStyleFallbacks = {
    primary: { backgroundColor: '#059669', borderColor: '#047857', borderWidth: 1 },
    secondary: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', borderWidth: 1 },
    outline: { backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderWidth: 1.5 },
    ghost: { backgroundColor: 'transparent', borderWidth: 0 },
    danger: { backgroundColor: '#dc2626', borderColor: '#b91c1c', borderWidth: 1 },
  }[variant];

  const buttonSizeFallbacks = {
    sm: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
    md: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14 },
    lg: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16 },
  }[size];

  const textStyleFallbacks = {
    primary: { color: '#ffffff', fontWeight: '700' as const },
    secondary: { color: '#1e293b', fontWeight: '600' as const },
    outline: { color: '#334155', fontWeight: '600' as const },
    ghost: { color: '#334155', fontWeight: '600' as const },
    danger: { color: '#ffffff', fontWeight: '700' as const },
  }[variant];

  const textSizeFallbacks = {
    sm: { fontSize: 13 },
    md: { fontSize: 15 },
    lg: { fontSize: 16 },
  }[size];

  return (
    <TouchableOpacity
      className={twMerge(
        clsx(
          baseButtonStyles,
          variantStyles,
          sizeStyles,
          isDisabled && 'opacity-60',
          className
        )
      )}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.6 : 1,
          shadowColor: variant === 'primary' ? '#059669' : '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: variant === 'primary' ? 0.2 : 0.05,
          shadowRadius: 4,
          elevation: variant === 'primary' ? 2 : 1,
        },
        buttonStyleFallbacks,
        buttonSizeFallbacks,
        props.style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#ffffff' : '#059669'}
        />
      ) : (
        <>
          {icon ? <Text style={{ marginRight: 8 }}>{icon}</Text> : null}
          {title ? (
            <Text
              className={twMerge(
                clsx(textVariantStyles, textSizeStyles, 'text-center')
              )}
              style={[
                { textAlign: 'center' },
                textStyleFallbacks,
                textSizeFallbacks,
              ]}
            >
              {title}
            </Text>
          ) : typeof children === 'string' ? (
            <Text
              className={twMerge(
                clsx(textVariantStyles, textSizeStyles, 'text-center')
              )}
              style={[
                { textAlign: 'center' },
                textStyleFallbacks,
                textSizeFallbacks,
              ]}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </>
      )}
    </TouchableOpacity>
  );
}
