import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Animated, BackHandler, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MapNotePreview } from '@/api/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { NOTE_TAP_DURATION } from '@/constants/home-map';
import { UI_MOTION } from '@/constants/ui-motion';
import type { NearbyNoteList } from '@/hooks/use-home-map';
import { useMotionPreference } from '@/hooks/use-motion-preference';
import { useSheetDrag, useVisibilityMotion } from '@/hooks/use-ui-motion';
import { ComposeIcon } from './ComposeIcon';

const PAPER_THUMBS = [
  require('../../../assets/images/nearby-note-paper.svg'),
  require('../../../assets/images/nearby-note-paper-lined.svg'),
  require('../../../assets/images/nearby-note-paper-dotted.svg'),
];
const AUTHOR_ICONS = {
  public: require('../../../assets/images/nearby-note-public.svg'),
  friends: require('../../../assets/images/nearby-note-friends.svg'),
};

export function NearbyNotesSheet({ list: pendingList, closingKey, height, onClose, onRetry, onLoadMore, onOpen }: {
  list: NearbyNoteList | null;
  closingKey: number | null;
  height: number;
  onClose: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onOpen: (note: MapNotePreview) => void;
}) {
  const [readyKey, setReadyKey] = useState<number | null>(null);
  const reduceMotion = useMotionPreference();
  const listKey = pendingList?.key;
  const activeList = pendingList && (reduceMotion || readyKey === listKey) ? pendingList : null;
  const motion = useVisibilityMotion(activeList, UI_MOTION.sheet);
  const visible = activeList !== null;
  const list = motion.content;
  const insets = useSafeAreaInsets();
  const panHandlers = useSheetDrag({ sheetKey: activeList?.key ?? null, height, progress: motion.progress, reduceMotion, onDismiss: onClose });

  useEffect(() => {
    if (listKey === undefined) return;
    const timer = setTimeout(() => setReadyKey(listKey), reduceMotion ? 0 : NOTE_TAP_DURATION);
    return () => clearTimeout(timer);
  }, [listKey, reduceMotion]);

  useFocusEffect(useCallback(() => {
    if (listKey === undefined) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => subscription.remove();
  }, [listKey, onClose]));

  // Keep previews on screen only for an explicit close. Data invalidated by the map disappears immediately.
  if (!list || (!visible && closingKey !== list.key)) return null;
  const translateY = motion.progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  return (
    <View {...motion.interactionProps} style={s.overlay} pointerEvents={visible ? 'box-none' : 'none'}>
      <Animated.View pointerEvents="none" style={[s.backdrop, { opacity: motion.progress }]} />
      <Animated.View key={list.key} style={[s.sheet, { height, transform: [{ translateY }] }]}
        accessibilityViewIsModal={visible} onAccessibilityEscape={onClose}>
        <View {...panHandlers} style={s.header}>
          <Pressable onPress={onClose} style={s.handleButton}
            accessibilityRole="button" accessibilityLabel="쪽지 목록 닫기" hitSlop={{ top: 10, bottom: 10 }}>
            <View style={s.handle} />
          </Pressable>
          <View style={s.headingRow}>
            <Text style={s.heading} accessibilityRole="header">쪽지{list.status === 'ready' && <Text style={s.count}> {list.notes.length}개{list.hasNext ? ' 불러옴' : ''}</Text>}</Text>
            <Text style={s.location} numberOfLines={1}>내 위치 기준</Text>
          </View>
          <Text style={s.description} accessibilityLiveRegion="polite">
            {list.status === 'loading' ? '열 수 있는 쪽지를 확인하고 있어요' : list.status === 'error'
              ? '목록을 다시 불러와 주세요' : list.notes.length ? '열람 가능한 쪽지 · 가까운 순'
                : list.hasNext ? '더 보기를 눌러 다음 쪽지를 확인해 주세요' : '지금 열 수 있는 쪽지가 없어요'}
          </Text>
        </View>
        {list.status === 'loading' ? (
          <View style={s.status}><LoadingSpinner color="#2350FF" accessibilityLabel="쪽지 목록 불러오는 중" active={visible} /></View>
        ) : list.status === 'error' ? (
          <View style={s.status}>
            <Text style={s.statusText}>{list.error}</Text>
            <Pressable onPress={onRetry} style={s.retry} accessibilityRole="button"><Text style={s.retryText}>다시 시도</Text></Pressable>
          </View>
        ) : (
          <FlatList
            data={list.notes}
            keyExtractor={(note) => note.noteId}
            contentContainerStyle={[s.items, { paddingBottom: Math.max(24, insets.bottom) }]}
            ItemSeparatorComponent={Separator}
            ListEmptyComponent={list.hasNext ? null : <Text style={s.statusText}>쪽지가 삭제되었거나 공개 범위가 바뀌었을 수 있어요.</Text>}
            ListFooterComponent={list.hasNext ? (
              <View style={s.status}>
                {list.error && <Text style={s.statusText}>{list.error}</Text>}
                {list.loadingMore ? (
                  <LoadingSpinner color="#2350FF" accessibilityLabel="추가 쪽지 불러오는 중" active={visible} />
                ) : (
                  <Pressable onPress={list.error ? onRetry : onLoadMore} style={s.retry} accessibilityRole="button">
                    <Text style={s.retryText}>{list.error ? '다시 시도' : '더 보기'}</Text>
                  </Pressable>
                )}
              </View>
            ) : null}
            renderItem={({ item: note, index }) => (
              <View style={s.card}>
                <Image source={PAPER_THUMBS[index % PAPER_THUMBS.length]} style={s.paper} contentFit="contain" accessible={false} />
                <View style={s.content}>
                  <Text style={s.preview} numberOfLines={1}>{note.preview}</Text>
                  <View style={s.metadata}>
                    {note.visibility === 'PRIVATE' ? <ComposeIcon name="lock" size={14} color="#8E8E93" />
                      : <Image source={note.visibility === 'FRIENDS' ? AUTHOR_ICONS.friends : AUTHOR_ICONS.public}
                        style={s.authorIcon} contentFit="contain" accessible={false} />}
                    <Text style={s.author} numberOfLines={1}>{note.isMine ? '내 쪽지' : note.authorNickname || '누군가'}{note.distanceMeters === null ? '' : ` · ${Math.ceil(note.distanceMeters)}m`}</Text>
                  </View>
                </View>
                <Pressable onPress={() => onOpen(note)} accessibilityRole="button" accessibilityLabel="쪽지 열기" style={s.open}>
                  <Text style={s.openText}>열기</Text>
                  <Image source={require('../../../assets/images/nearby-note-open.svg')} style={s.authorIcon} contentFit="contain" accessible={false} />
                </Pressable>
              </View>
            )}
          />
        )}
      </Animated.View>
    </View>
  );
}

function Separator() { return <View style={s.separator} />; }

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 30 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.22)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', backgroundColor: '#F7F7F5', boxShadow: '0px -6px 24px rgba(0, 0, 0, 0.12)' },
  handleButton: { position: 'absolute', top: 0, left: 0, right: 0, height: 26, alignItems: 'center', paddingTop: 10, zIndex: 1 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#D1D1D6' },
  header: { paddingTop: 30, paddingHorizontal: 24, paddingBottom: 13 },
  headingRow: { flexDirection: 'row', alignItems: 'center', minHeight: 32, gap: 12 },
  heading: { fontFamily: 'NotoSansKR-Medium', fontSize: 22, lineHeight: 32, letterSpacing: -0.6, color: '#0E0E0E', includeFontPadding: false },
  count: { fontFamily: 'NotoSansKR-Bold' },
  location: { flex: 1, minWidth: 0, fontFamily: 'NotoSansKR-Medium', fontSize: 12, lineHeight: 18, letterSpacing: -0.3, color: '#8E8E93', includeFontPadding: false },
  description: { marginTop: 6, fontFamily: 'NotoSansKR-Medium', fontSize: 13, lineHeight: 19, letterSpacing: -0.3, color: '#5A5A5E', includeFontPadding: false },
  items: { paddingHorizontal: 24 },
  separator: { height: 10 },
  card: { height: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: '#FFFFFF', boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' },
  paper: { width: 48, height: 52, flexShrink: 0 },
  content: { flex: 1, minWidth: 0, gap: 4 },
  preview: { fontFamily: 'NotoSansKR-Regular', fontSize: 15, lineHeight: 23, color: '#1C1C1E', includeFontPadding: false },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorIcon: { width: 14, height: 14, flexShrink: 0 },
  author: { flex: 1, fontFamily: 'NotoSansKR-Medium', fontSize: 12, lineHeight: 18, letterSpacing: -0.3, color: '#8E8E93', includeFontPadding: false },
  open: { width: 76, minHeight: 37, borderRadius: 999, backgroundColor: '#D6F65A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  openText: { fontFamily: 'NotoSansKR-Bold', fontSize: 14, lineHeight: 21, letterSpacing: -0.3, color: '#0E0E0E', includeFontPadding: false },
  status: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  statusText: { fontFamily: 'NotoSansKR-Regular', fontSize: 14, lineHeight: 22, color: '#5A5A5E', textAlign: 'center' },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 22, backgroundColor: '#D6F65A' },
  retryText: { fontFamily: 'NotoSansKR-Bold', fontSize: 14, color: '#0E0E0E' },
});
