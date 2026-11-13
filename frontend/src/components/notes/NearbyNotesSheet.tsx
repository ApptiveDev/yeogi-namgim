import { BottomSheet, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, FlatList, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { NOTE_TAP_DURATION } from '@/constants/home-map';
import type { NearbyNoteList } from '@/hooks/use-home-map';
import { useMotionPreference } from '@/hooks/use-motion-preference';
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

type SheetProps = {
  height: number;
  onClose: (key: number) => void;
  onLoadMore: () => void;
  onOpen: (key: number, noteId: string) => boolean;
};

const CARD_HEIGHT = 76;
const CARD_GAP = 10;
const ANDROID_SHEET_MAX_WIDTH = 640;

export function NearbyNotesSheet({ list, onClose, ...props }: SheetProps & { list: NearbyNoteList | null }) {
  const [readyKey, setReadyKey] = useState<number | null>(null);
  const reduceMotion = useMotionPreference();
  const listKey = list?.key;
  const ready = listKey !== undefined && (reduceMotion || readyKey === listKey);

  useEffect(() => {
    if (listKey === undefined || readyKey === listKey) return;
    const timer = setTimeout(() => setReadyKey(listKey), reduceMotion ? 0 : NOTE_TAP_DURATION);
    return () => clearTimeout(timer);
  }, [listKey, readyKey, reduceMotion]);

  useFocusEffect(useCallback(() => {
    if (listKey === undefined || ready) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onClose(listKey); return true; });
    return () => subscription.remove();
  }, [listKey, onClose, ready]));

  if (!list || !ready) return null;
  return <NearbyNotesModal key={list.key} list={list} onClose={onClose} {...props} />;
}

function NearbyNotesModal({ list, height, onClose, onLoadMore, onOpen }: SheetProps & { list: NearbyNoteList }) {
  const sheet = useRef<BottomSheet>(null);
  const pendingNote = useRef<{ id: string; scrollY: number } | null>(null);
  const closing = useRef(false);
  const returnToList = useRef(false);
  const scrollY = useRef(0);
  const [contentOffset, setContentOffset] = useState({ x: 0, y: 0 });
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Material 3 uses a half-screen anchor for partial expansion. Size the content instead
  // so Android has one open position, as on iOS, and leaves the selected point above it.
  const snapPoints = useMemo(() => Platform.OS === 'android' ? undefined : [height], [height]);

  useFocusEffect(useCallback(() => {
    if (!returnToList.current) return;
    returnToList.current = false;
    closing.current = false;
    sheet.current?.present();
  }, []));

  function close(noteId: string | null = null) {
    if (closing.current || !sheet.current) return;
    closing.current = true;
    pendingNote.current = noteId === null ? null : { id: noteId, scrollY: scrollY.current };
    sheet.current.close();
  }

  function handleDismiss() {
    const note = pendingNote.current;
    pendingNote.current = null;
    // The detail route presents a modal too. Wait for the native sheet to be fully dismissed.
    if (note && onOpen(list.key, note.id)) {
      setContentOffset({ x: 0, y: note.scrollY });
      returnToList.current = true;
      return;
    }
    onClose(list.key);
  }

  return (
    <BottomSheet ref={sheet} snapPoints={snapPoints} enablePanDownToClose onDismiss={handleDismiss}
      backgroundStyle={s.background} handleComponent={null}>
      <BottomSheetView style={[
        s.body,
        Platform.OS === 'android' && {
          width: Math.min(width, ANDROID_SHEET_MAX_WIDTH),
          height: Math.max(1, height - insets.bottom),
        },
        Platform.OS === 'web' && { height },
      ]}>
        <View style={s.contentArea} accessibilityViewIsModal onAccessibilityEscape={() => close()}>
          <Pressable onPress={() => close()} style={s.handleButton} accessibilityRole="button" accessibilityLabel="쪽지 목록 닫기">
            <View style={s.handle} />
          </Pressable>
          <View style={s.header}>
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
            <View style={s.status}><LoadingSpinner color="#2350FF" accessibilityLabel="쪽지 목록 불러오는 중" /></View>
          ) : list.status === 'error' ? (
            <View style={s.status}>
              <Text style={s.statusText}>{list.error}</Text>
              <Pressable onPress={onLoadMore} style={s.retry} accessibilityRole="button"><Text style={s.retryText}>다시 시도</Text></Pressable>
            </View>
          ) : (
            <FlatList
              data={list.notes}
              keyExtractor={(note) => note.noteId}
              style={s.list}
              contentContainerStyle={s.items}
              contentOffset={contentOffset}
              initialScrollIndex={Math.max(0, Math.min(list.notes.length - 1, Math.floor(contentOffset.y / (CARD_HEIGHT + CARD_GAP))))}
              onScroll={(event) => { scrollY.current = Math.max(0, event.nativeEvent.contentOffset.y); }}
              scrollEventThrottle={16}
              nestedScrollEnabled
              getItemLayout={(_, index) => ({ length: CARD_HEIGHT, offset: index * (CARD_HEIGHT + CARD_GAP), index })}
              ItemSeparatorComponent={Separator}
              ListEmptyComponent={list.hasNext ? null : <Text style={s.statusText}>쪽지가 삭제되었거나 공개 범위가 바뀌었을 수 있어요.</Text>}
              ListFooterComponent={list.hasNext ? (
                <View style={s.status}>
                  {list.error && <Text style={s.statusText}>{list.error}</Text>}
                  {list.loadingMore ? (
                    <LoadingSpinner color="#2350FF" accessibilityLabel="추가 쪽지 불러오는 중" />
                  ) : (
                    <Pressable onPress={onLoadMore} style={s.retry} accessibilityRole="button">
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
                  <Pressable onPress={() => close(note.noteId)} accessibilityRole="button" accessibilityLabel="쪽지 열기" style={s.open}>
                    <Text style={s.openText}>열기</Text>
                    <Image source={require('../../../assets/images/nearby-note-open.svg')} style={s.authorIcon} contentFit="contain" accessible={false} />
                  </Pressable>
                </View>
              )}
            />
          )}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

function Separator() { return <View style={s.separator} />; }

const s = StyleSheet.create({
  background: { backgroundColor: '#F7F7F5' },
  body: { flex: 1 },
  contentArea: { flex: 1 },
  handleButton: { height: 30, alignItems: 'center', paddingTop: 10 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#D1D1D6' },
  header: { paddingHorizontal: 24, paddingBottom: 13 },
  headingRow: { flexDirection: 'row', alignItems: 'center', minHeight: 32, gap: 12 },
  heading: { fontFamily: 'NotoSansKR-Medium', fontSize: 22, lineHeight: 32, letterSpacing: -0.6, color: '#0E0E0E', includeFontPadding: false },
  count: { fontFamily: 'NotoSansKR-Bold' },
  location: { flex: 1, minWidth: 0, fontFamily: 'NotoSansKR-Medium', fontSize: 12, lineHeight: 18, letterSpacing: -0.3, color: '#8E8E93', includeFontPadding: false },
  description: { marginTop: 6, fontFamily: 'NotoSansKR-Medium', fontSize: 13, lineHeight: 19, letterSpacing: -0.3, color: '#5A5A5E', includeFontPadding: false },
  list: { flex: 1 },
  items: { paddingHorizontal: 24, paddingBottom: 24 },
  separator: { height: CARD_GAP },
  card: { height: CARD_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: '#FFFFFF', boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)' },
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
