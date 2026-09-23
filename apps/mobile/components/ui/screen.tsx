import React from 'react';
import {
  View,
  ScrollView,
  Platform,
  ViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  scroll?: boolean;
  safeArea?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = false,
  safeArea = true,
  className,
  style,
  contentContainerStyle,
  ...props
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        { flexGrow: 1, paddingBottom: 24 },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, style]}>
      {children}
    </View>
  );

  const inner = (
    <View
      className={twMerge(clsx('flex-1 bg-slate-50', className))}
      {...props}
      style={[{ flex: 1, backgroundColor: '#f8fafc' }, !scroll && style]}
    >
      {content}
    </View>
  );

  const container = safeArea ? (
    <SafeAreaView
      edges={['top']}
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      className="flex-1 bg-slate-50"
    >
      {inner}
    </SafeAreaView>
  ) : (
    inner
  );

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, width: '100%', backgroundColor: '#f1f5f9', alignItems: 'center' }}>
        <View
          style={
            {
              width: '100%',
              maxWidth: 480,
              flex: 1,
              backgroundColor: '#f8fafc',
              minHeight: '100vh',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
            } as unknown as object
          }
        >
          {container}
        </View>
      </View>
    );
  }

  return container;
}
