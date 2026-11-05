import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/fonts';
import { SettingsColors as C } from '@/constants/colors';

type Props = {
  label: string;
  description?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
};

export function SettingsRow({ label, description, trailing, onPress, accessibilityLabel = label, accessibilityHint = '준비 중 안내를 확인합니다', disabled }: Props) {
  const content = <>
    <View style={s.copy}>
      <Text style={s.label}>{label}</Text>
      {description ? <Text style={s.description}>{description}</Text> : null}
    </View>
    {trailing}
    {onPress ? <View style={s.chevron} /> : null}
  </>;

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.row, description && s.withDescription, pressed && s.pressed, disabled && s.disabled]}>
        {content}
      </Pressable>
    );
  }
  return <View style={[s.row, description && s.withDescription]}>{content}</View>;
}

export function SettingsBadge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'kakao' }) {
  return <View style={[s.badge, tone === 'kakao' && s.kakao]}><Text style={s.badgeText}>{label}</Text></View>;
}

const s = StyleSheet.create({
  row: { minHeight: 46, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  withDescription: { minHeight: 60, paddingVertical: 10 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 14, lineHeight: 20, color: C.ink, includeFontPadding: false },
  description: { fontFamily: FontFamilies.notoSansKrMedium, fontSize: 12, lineHeight: 18, color: C.muted, includeFontPadding: false },
  chevron: { width: 6, height: 6, marginRight: 3, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: C.muted, transform: [{ rotate: '45deg' }] },
  pressed: { backgroundColor: C.background },
  disabled: { opacity: 0.6 },
  badge: { minHeight: 22, paddingVertical: 2, paddingHorizontal: 10, borderRadius: 11, backgroundColor: C.neutral, justifyContent: 'center' },
  kakao: { backgroundColor: C.kakao },
  badgeText: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 11, lineHeight: 18, color: C.ink, includeFontPadding: false },
});
