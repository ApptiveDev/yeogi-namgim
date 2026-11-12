import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { FontFamilies } from '@/constants/fonts';
import { UI_MOTION } from '@/constants/ui-motion';
import { useSlideMotion } from '@/hooks/use-ui-motion';

export function Snackbar({ message, bottom, actionLabel, onAction }: {
  message: string | null;
  bottom: number;
  actionLabel: string;
  onAction: () => void;
}) {
  const [height, setHeight] = useState(96);
  const { content, slideStyle, interactionProps } = useSlideMotion(message, bottom + height, UI_MOTION.snackbar);
  if (!content) return null;

  return (
    <Animated.View {...interactionProps} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      style={[s.bar, { bottom }, slideStyle]}>
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.message}>{content}</Text>
      <Pressable accessibilityRole="button" onPress={onAction} style={s.action}>
        <Text style={s.actionText}>{actionLabel}</Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute', left: 24, right: 24, zIndex: 10, flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingVertical: 4, paddingLeft: 16, paddingRight: 4, borderRadius: 12, backgroundColor: '#2C2C2E',
  },
  message: { flex: 1, color: '#FFFFFF', fontFamily: FontFamilies.notoSansKrRegular, fontSize: 14, lineHeight: 21 },
  action: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  actionText: { color: '#D6F65A', fontFamily: FontFamilies.notoSansKrBold, fontSize: 14 },
});
