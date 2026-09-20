import React from 'react';
import { View, ViewProps } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={twMerge(
        clsx(
          'bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm',
          className
        )
      )}
      {...props}
    >
      {children}
    </View>
  );
}
