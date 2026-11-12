import { Image } from 'expo-image';
import { Animated, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { NOTE_READ_RADIUS_METERS } from '@/constants/home-map';
import type { NoteMapSelection } from '@/hooks/use-home-map';
import { usePopupMotion } from '@/hooks/use-ui-motion';
import { NoteSelectionHighlight } from './NoteSelectionHighlight';

export function NoteLockedDialog({ selection: selectedPoint, onClose }: { selection: NoteMapSelection | null; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const activeSelection = selectedPoint?.isInside === false ? selectedPoint : null;
  const motion = usePopupMotion(activeSelection);
  const selection = motion.content;
  if (!selection) return null;
  return (
    <Modal transparent animationType="none" statusBarTranslucent navigationBarTranslucent
      onRequestClose={() => { if (activeSelection) onClose(); }}>
      <Animated.View {...motion.interactionProps} style={[s.container, { opacity: motion.opacity }]}>
        <Pressable style={s.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="안내 닫기" />
        <NoteSelectionHighlight key={selection.key} point={selection.point} isInside={false} screenPoint={selection.screenPoint} />
        <Animated.View key={selection.key} style={[s.card, { transform: [{ translateY: height * 0.04 }, { scale: motion.scale }] }]}
          accessibilityViewIsModal onAccessibilityEscape={onClose}>
          <View style={s.badge}>
            <Image source={require('../../../assets/images/map-note-lock.svg')} style={s.lock} contentFit="contain" accessible={false} />
          </View>
          <Text style={s.title} accessibilityRole="header">가까이 가야 볼 수 있어요</Text>
          <Text style={s.message}>
            반경 {NOTE_READ_RADIUS_METERS}m 안에서 쪽지를 볼 수 있어요{'\n'}
            {selection.point.count === 1 ? '이 쪽지' : '가장 가까운 쪽지'}까지 약 {Math.ceil(selection.distanceMeters)}m
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [s.confirm, pressed && s.pressed]}>
            <Text style={s.confirmText}>확인</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14, 14, 14, 0.55)' },
  card: { width: '100%', maxWidth: 300, paddingTop: 28, paddingBottom: 20, paddingHorizontal: 20, borderRadius: 28, backgroundColor: '#F7F7F5', alignItems: 'center', boxShadow: '0px 16px 40px rgba(0, 0, 0, 0.3)' },
  badge: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center' },
  lock: { width: 28, height: 28 },
  title: { marginTop: 16, fontFamily: 'Pretendard-Bold', fontSize: 18, color: '#0E0E0E', textAlign: 'center' },
  message: { marginTop: 6, fontFamily: 'Pretendard-Regular', fontSize: 13, lineHeight: 19, color: '#8E8E93', textAlign: 'center' },
  confirm: { marginTop: 20, alignSelf: 'stretch', minHeight: 52, paddingVertical: 16, borderRadius: 999, backgroundColor: '#D6F65A', alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontFamily: 'Pretendard-Bold', fontSize: 16, color: '#0E0E0E' },
  pressed: { opacity: 0.75 },
});
