import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: '#fef2f2',
            padding: 24,
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: '#fecaca',
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: '#dc2626',
                marginBottom: 8,
              }}
            >
              {this.props.fallbackTitle || 'Application Error'}
            </Text>
            <Text style={{ fontSize: 14, color: '#475569', marginBottom: 12 }}>
              An error occurred while displaying this screen.
            </Text>
            <ScrollView
              style={{
                maxHeight: 180,
                backgroundColor: '#f8fafc',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: '#dc2626',
                  fontFamily: 'monospace',
                }}
              >
                {this.state.error?.toString()}
              </Text>
              {this.state.errorInfo?.componentStack ? (
                <Text
                  style={{
                    fontSize: 11,
                    color: '#64748b',
                    marginTop: 8,
                    fontFamily: 'monospace',
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </Text>
              ) : null}
            </ScrollView>
            <TouchableOpacity
              onPress={() =>
                this.setState({ hasError: false, error: null, errorInfo: null })
              }
              style={{
                backgroundColor: '#059669',
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                Reload Screen
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
