import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import type { NoteOpenResponse } from '@/api/types';
import { ComposeIcon } from './ComposeIcon';

export type ReadableNote = NoteOpenResponse & {
  latitude: number;
  longitude: number;
};

type Props = {
  note: ReadableNote | null;
  onClose: () => void;
};

export function NoteReadDialog({ note, onClose }: Props) {
  const { height } = useWindowDimensions();

  if (!note) return null;

  const createdAt = new Date(note.createdAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="쪽지 닫기"
          onPress={onClose}
        />

        <View
          style={[s.dialog, { height: Math.min(height * 0.84, 680) }]}
          accessibilityViewIsModal
        >
          <View style={s.header}>
            <Text style={s.title} accessibilityRole="header">
              {note.isMine ? '내가 남긴 쪽지' : '쪽지'}
            </Text>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="쪽지 닫기"
              style={s.closeButton}
            >
              <ComposeIcon name="close" size={20} />
            </Pressable>
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.content}
          >
            <View style={s.paper}>
              <View style={s.tape} />
              <Text style={s.noteText}>{note.content}</Text>
            </View>

            <View style={s.infoCard}>
              <View style={s.iconCircle}>
                <ComposeIcon name="location" size={23} />
              </View>

              <View style={s.infoText}>
                <Text style={s.infoTitle}>장소</Text>
                <Text selectable style={s.infoValue}>
                  {note.latitude.toFixed(5)}, {note.longitude.toFixed(5)}
                </Text>
              </View>
            </View>

            <View style={s.infoCard}>
              <View style={s.infoText}>
                <Text style={s.infoTitle}>남긴 날짜</Text>
                <Text style={s.infoValue}>{createdAt}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFEFA',
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  header: {
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEAE1',
  },
  title: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 19,
    color: '#292720',
  },
  closeButton: {
    position: 'absolute',
    right: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  content: { padding: 18, paddingTop: 28, paddingBottom: 24 },
  paper: {
    minHeight: 260,
    padding: 24,
    paddingTop: 32,
    marginBottom: 24,
    borderRadius: 9,
    backgroundColor: '#FFF8CF',
    shadowColor: '#8F7B31',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  tape: {
    position: 'absolute',
    top: -10,
    left: '50%',
    marginLeft: -32,
    width: 64,
    height: 23,
    backgroundColor: 'rgba(239, 210, 111, 0.6)',
    transform: [{ rotate: '-3deg' }],
  },
  noteText: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 17,
    lineHeight: 29,
    color: '#433D2D',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: '#F8F5EB',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0B4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: { flex: 1 },
  infoTitle: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 14,
    color: '#292720',
    marginBottom: 5,
  },
  infoValue: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: '#6E695F',
  },
});