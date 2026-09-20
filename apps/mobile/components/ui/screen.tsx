import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  scroll?: boolean;
  safeArea?: boolean;
}

export function Screen({
  children,
  scroll = false,
  safeArea = true,
  className,
  ...props
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1">{children}</View>
  );

  const inner = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className={twMerge(clsx('flex-1 bg-slate-50', className))}
      {...props}
    >
      {content}
    </KeyboardAvoidingView>
  );

  if (safeArea) {
    return <SafeAreaView className="flex-1 bg-slate-50">{inner}</SafeAreaView>;
  }

  return inner;
}
