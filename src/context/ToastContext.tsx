import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, makeStyles, useTheme } from '../theme';

export type ToastKind = 'success' | 'error' | 'info';
type ShowToast = (msg: string, kind?: ToastKind) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; msg: string; kind: ToastKind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  const show = useCallback<ShowToast>((msg, kind = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), msg, kind });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const icon =
    toast?.kind === 'success' ? 'checkmark-circle' : toast?.kind === 'error' ? 'alert-circle' : 'information-circle';
  const color =
    toast?.kind === 'success' ? colors.onSuccess : toast?.kind === 'error' ? colors.onError : colors.brandPrimary;

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={FadeInUp}
          exiting={FadeOutUp}
          pointerEvents="none"
          style={[styles.toast, { top: insets.top + 8 }]}
          testID="toast"
        >
          <Ionicons name={icon} size={20} color={color} />
          <Text style={styles.text} testID="toast-message">
            {toast.msg}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const useStyles = makeStyles((c) => ({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: c.surfaceTertiary,
    borderWidth: 1,
    borderColor: c.borderStrong,
    zIndex: 200,
    elevation: 200,
  },
  text: { color: c.onSurface, fontFamily: fonts.textMedium, fontSize: 14, flex: 1 },
}));
