import { StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/colors';

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
  title: { fontFamily: FontFamilies.archivoBlack, fontSize: 58, lineHeight: 52, color: C.ink, letterSpacing: -1, includeFontPadding: false },
});
