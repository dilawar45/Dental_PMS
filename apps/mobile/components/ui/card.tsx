import React from 'react';
import { View, ViewProps } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, style, ...props }: CardProps) {
  return (
    <View
      className={twMerge(
        clsx(
          'bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm',
          className
        )
      )}
      {...props}
      style={[
        {
          backgroundColor: '#ffffff',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          padding: 16,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
