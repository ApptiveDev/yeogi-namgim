import { useSyncExternalStore } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamilies } from '@/constants/fonts';
import { UI_MOTION } from '@/constants/ui-motion';
import { useVisibilityMotion } from '@/hooks/use-ui-motion';

type ToastMessage = { text: string; variant: 'default' | 'success' };

let message: ToastMessage | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => message;
const serverSnapshot = () => null;

export function showToast(text: string, variant: ToastMessage['variant'] = 'default') {
  clearTimeout(timer);
  message = { text, variant };
  listeners.forEach((listener) => listener());
  timer = setTimeout(() => {
    message = null;
    listeners.forEach((listener) => listener());
  }, UI_MOTION.toast.hold);
}

export function Toast({ visible = true }: { visible?: boolean }) {
  return visible ? <ToastPresenter /> : null;
}

function ToastPresenter() {
  const message = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const insets = useSafeAreaInsets();
  const { content, opacity, interactionProps } = useVisibilityMotion(message, UI_MOTION.toast);
  if (!content?.text) return null;
  const success = content.variant === 'success';
  return (
    <Animated.View {...interactionProps} pointerEvents="none" style={[s.position, { bottom: insets.bottom + 96, opacity }]}>
      <View style={success ? s.success : s.toast}>
        {success && (
          <View style={s.badge}>
            <View style={s.check} />
          </View>
        )}
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.text, success && s.successText]}>
          {content.text}
        </Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  position: { position: 'absolute', left: 24, right: 24, zIndex: 100 },
  toast: { padding: 14, borderRadius: 12, backgroundColor: '#2C2C2E' },
  success: {
    alignSelf: 'center', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: 44, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999,
    backgroundColor: '#222222', boxShadow: '0px 6px 18px rgba(0, 0, 0, 0.20)',
  },
  badge: {
    width: 22, height: 22, flexShrink: 0, borderRadius: 11, backgroundColor: '#139c4f',
    alignItems: 'center', justifyContent: 'center',
  },
  check: {
    width: 7, height: 11, borderColor: '#FFFFFF', borderRightWidth: 2, borderBottomWidth: 2,
    borderBottomRightRadius: 1, transform: [{ translateY: -1.5 }, { rotate: '45deg' }],
  },
  text: { color: '#FFFFFF',fontFamily: FontFamilies.notoSansKrRegular ,fontSize: 14, lineHeight: 21, textAlign: 'center' },
  successText: { flexShrink: 1,fontFamily:FontFamilies.notoSansKrBold ,fontSize: 14, lineHeight: 21},
});
