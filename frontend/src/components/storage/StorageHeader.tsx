import { StyleSheet, Text, View } from 'react-native';

import { StorageColors as C, StorageFonts as F } from '@/constants/storage';

export function StorageHeader() {
  return (
    <View style={s.header}>
      <Text accessibilityRole="header" accessibilityLabel="My notes" style={s.title}>
        {'MY\nNOTES'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingTop: 18, paddingBottom: 18 },
  title: { fontFamily: F.display, fontSize: 58, lineHeight: 52, color: C.ink, letterSpacing: -1, includeFontPadding: false },
});
