import React from 'react';
import { Stack } from 'expo-router';
import { ErrorBoundary } from '../../components/error-boundary';

export default function AuthLayout() {
  return (
    <ErrorBoundary fallbackTitle="Authentication Screen Error">
      <Stack
        initialRouteName="login"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
      </Stack>
    </ErrorBoundary>
  );
}
