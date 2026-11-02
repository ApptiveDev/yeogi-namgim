import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SettingsColors as C, SettingsFonts as F } from '@/constants/settings';

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text accessibilityRole="header" style={s.title}>{title}</Text>
      <View style={s.card}>
        {Children.toArray(children).map((child, index) => (
          <Fragment key={index}>
            {index > 0 && <View style={s.divider} />}
            {child}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 12 },
  title: { marginLeft: 8, marginBottom: 6, color: C.section, fontFamily: F.bold, fontSize: 11, lineHeight: 16, letterSpacing: 1, includeFontPadding: false },
  card: { borderRadius: 20, backgroundColor: C.surface, borderWidth: 0, borderColor: C.border, overflow: 'hidden' },
  divider: { height: 1, marginHorizontal: 18, backgroundColor: C.line },
});
