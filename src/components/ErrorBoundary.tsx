import { reloadAppAsync } from 'expo';
import React, { Component } from 'react';
import { Pressable, Text, View } from 'react-native';
import { makeStyles } from '../theme';

function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  const styles = useStyles();
  const handleReload = async () => {
    try {
      await reloadAppAsync();
    } catch {
      resetError();
    }
  };
  return (
    <View style={styles.container} testID="error-fallback">
      <View style={styles.content}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>Please reload the app to continue.</Text>
        {__DEV__ ? <Text style={styles.devMessage}>{String(error?.message ?? error)}</Text> : null}
        <Pressable
          onPress={handleReload}
          testID="error-fallback-reload"
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Reload app</Text>
        </Pressable>
      </View>
    </View>
  );
}

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary] render crash:', error, info.componentStack ?? '');
  }

  resetError = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
  }
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.surface, justifyContent: 'center', padding: 24 },
  content: { alignItems: 'center', gap: 12 },
  title: { color: c.onSurface, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  message: { color: c.muted, fontSize: 15, textAlign: 'center' },
  devMessage: { color: c.error, fontSize: 13, textAlign: 'center' },
  button: {
    marginTop: 8,
    backgroundColor: c.brandPrimary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    minWidth: 180,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: c.onBrandPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center' },
}));
