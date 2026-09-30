import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { NoteMarker } from './NoteMarker';

interface NoteCreatedDialogProps {
  visible: boolean;
  onConfirm: () => void;
}

export function NoteCreatedDialog({ visible, onConfirm }: NoteCreatedDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onConfirm}>
      <View style={s.backdrop}>
        <View style={s.card} accessibilityViewIsModal>
          <NoteMarker state="owned" size={64} />
          <Text style={s.title} accessibilityRole="header">쪽지를 남겼어요!</Text>
          <Text style={s.message}>다른 사용자가 발견할 수 있어요</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="확인"
            onPress={onConfirm}
            style={({ pressed }) => [s.confirm, pressed && s.pressed]}
          >
            <Text style={s.confirmText}>확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 320, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', paddingTop: 12, paddingHorizontal: 24, paddingBottom: 16, shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 8 },
  title: { fontFamily: 'Pretendard-Regular', fontSize: 22, color: '#111111', textAlign: 'center', marginTop: 8 },
  message: { fontFamily: 'Pretendard-Regular', fontSize: 17, lineHeight: 25, color: '#111111', textAlign: 'center', marginTop: 5 },
  confirm: { alignSelf: 'stretch', minHeight: 44, borderRadius: 18, backgroundColor: '#FFCC3D', alignItems: 'center', justifyContent: 'center', marginTop: 30, padding: 10 },
  confirmText: { fontFamily: 'Pretendard-Regular', fontSize: 16, color: '#111111' },
  pressed: { opacity: 0.75 },
});
