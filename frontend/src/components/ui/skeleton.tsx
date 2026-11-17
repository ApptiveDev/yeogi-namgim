import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Palette } from '@/constants/colors';

type SkeletonProps = PropsWithChildren<{
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}>;

export function Skeleton({ label, containerStyle, style, children }: SkeletonProps) {
  return (
    <View style={containerStyle} accessible accessibilityRole="progressbar" accessibilityLabel={`${label} 불러오는 중`} accessibilityState={{ busy: true }}>
      <View style={style} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

export function SkeletonBlock({ style }: { style: StyleProp<ViewStyle> }) {
  return <View style={[s.block, style]} />;
}

const s = StyleSheet.create({
  block: { backgroundColor: Palette.neutral.gray300, borderRadius: 6 },
});
