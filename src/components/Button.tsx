import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, Text, ViewStyle } from 'react-native';
import { fonts, makeStyles, useTheme } from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, icon, style, testID }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = variant === 'primary' ? colors.onBrandPrimary : variant === 'danger' ? colors.onError : colors.onSurface;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && { opacity: 0.6 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
          <Text style={[styles.label, { color }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  base: {
    minHeight: 54,
    borderRadius: 999,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: { backgroundColor: c.brandPrimary },
  ghost: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  danger: { backgroundColor: c.error },
  label: { fontFamily: fonts.textBold, fontSize: 15, letterSpacing: 0.5 },
}));
