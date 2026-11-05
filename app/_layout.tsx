import { Cormorant_500Medium, Cormorant_600SemiBold, Cormorant_400Regular_Italic } from '@expo-google-fonts/cormorant';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { LogBox, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { LockGate } from '../src/components/LockGate';
import { LockProvider } from '../src/context/LockContext';
import { ToastProvider } from '../src/context/ToastContext';
import { VaultProvider } from '../src/context/VaultContext';
import { queryClient } from '../src/lib/queryClient';
import { useTheme } from '../src/theme';

LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  const { colors } = useTheme();
  const [loaded, error] = useFonts({
    'Cormorant-SemiBold': Cormorant_600SemiBold,
    'Cormorant-Medium': Cormorant_500Medium,
    'Cormorant-Italic': Cormorant_400Regular_Italic,
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-Bold': DMSans_700Bold,
  });

  if (!loaded && !error) {
    return <View style={[styles.root, { backgroundColor: colors.surface }]} />;
  }

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.surface }]}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            <ToastProvider>
              <VaultProvider>
                <LockProvider>
                  <StatusBar style="light" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.surface },
                      animation: 'fade_from_bottom',
                    }}
                  >
                    <Stack.Screen name="editor" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="viewer" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
                  </Stack>
                  <LockGate />
                </LockProvider>
              </VaultProvider>
            </ToastProvider>
          </KeyboardProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
