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
          {icon ? <Text className="mr-2">{icon}</Text> : null}
          {title ? (
            <Text
              className={twMerge(
                clsx(textVariantStyles, textSizeStyles, 'text-center')
              )}
            >
              {title}
            </Text>
          ) : typeof children === 'string' ? (
            <Text
              className={twMerge(
                clsx(textVariantStyles, textSizeStyles, 'text-center')
              )}
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
