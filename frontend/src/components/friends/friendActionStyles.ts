import { StyleSheet } from 'react-native';

import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/colors';

export const friendActionStyles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primary: { backgroundColor: C.lime },
  secondary: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.ink },
  label: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 16, lineHeight: 24, color: C.ink, textAlign: 'center', includeFontPadding: false, flexShrink: 1 },
  compact: { minHeight: 33, paddingHorizontal: 12, paddingVertical: 4, gap: 4 },
  compactLabel: { fontSize: 14, lineHeight: 20 },
  iconLabel: { transform: [{ translateY: -1 }] },
});
