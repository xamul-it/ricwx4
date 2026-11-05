import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '../lib/nav';
import { fonts, makeStyles, useTheme } from '../theme';

type Props = {
  title: string;
  right?: React.ReactNode;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onBack?: () => void;
};

export function ScreenHeader({ title, right, leftIcon = 'chevron-back', onBack }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <Pressable
        testID="header-back-button"
        onPress={onBack ?? (() => goBack(router))}
        style={styles.icon}
        hitSlop={8}
      >
        <Ionicons name={leftIcon} size={22} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: c.surface,
    gap: 8,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  title: { flex: 1, color: c.onSurface, fontFamily: fonts.display, fontSize: 24, textAlign: 'center' },
  right: { minWidth: 44, alignItems: 'flex-end' },
}));
