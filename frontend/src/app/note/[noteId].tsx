import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams, useIsFocused } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast } from '@/components/ui/toast';
import { useNoteDetail } from '@/hooks/use-note-detail';

const ASSETS = {
  grid: require('../../../assets/images/note-detail/grid.svg'),
  back: require('../../../assets/images/note-detail/back.svg'),
  more: require('../../../assets/images/note-detail/more.svg'),
  bookmark: require('../../../assets/images/note-detail/bookmark.svg'),
  share: require('../../../assets/images/note-detail/share.svg'),
  pin: require('../../../assets/images/note-detail/pin.svg'),
};

export default function NoteDetailScreen() {
  const params = useLocalSearchParams<{ noteId?: string | string[]; skipLocation?: string }>();
  const detail = useNoteDetail(typeof params.noteId === 'string' ? params.noteId : '', params.skipLocation === 'true');
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [fontsLoaded, fontError] = useFonts({
    NanumPen: require('../../../assets/fonts/NanumPenScript-Regular.ttf'),
    'NotoSansKR-Regular': require('../../../assets/fonts/NotoSansKR-Regular.otf'),
    'NotoSansKR-Medium': require('../../../assets/fonts/NotoSansKR-Medium.otf'),
    'NotoSansKR-Bold': require('../../../assets/fonts/NotoSansKR-Bold.otf'),
  });
  const note = detail.note;
  const back = () => { if (router.canGoBack()) router.back(); else router.replace('/'); };
  return (
    <View style={s.screen}>
      <Stack.Screen options={{ headerShown: false, statusBarStyle: 'light', contentStyle: { backgroundColor: 'transparent' } }} />
      <View style={[s.content, { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={s.header}>
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="쪽지 목록으로 돌아가기" style={s.iconButton}>
            <Image source={ASSETS.back} style={s.icon20} contentFit="contain" accessible={false} />
          </Pressable>
          <Pressable disabled accessibilityRole="button" accessibilityLabel="더보기" accessibilityState={{ disabled: true }} style={s.iconButton}>
            <Image source={ASSETS.more} style={s.icon20} contentFit="contain" accessible={false} />
          </Pressable>
        </View>
        {detail.loading || (!fontsLoaded && !fontError) ? (
          <View style={s.status}><ActivityIndicator color="#D6F65A" accessibilityLabel="쪽지 불러오는 중" /></View>
        ) : note ? <>
          <View style={s.paper}>
            <Image source={ASSETS.grid} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
            <ScrollView style={s.bodyScroll} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator accessibilityLabel="쪽지 본문">
              <Text selectable style={[s.body, fontError && s.fallback]}>{note.content}</Text>
            </ScrollView>
          </View>
            <View style={s.location}>
              <Image source={ASSETS.pin} style={s.icon22} contentFit="contain" accessible={false} />
              <View style={s.locationText}>
                <Text style={s.address} numberOfLines={2}>{note.placeName || note.neighborhood || '장소 정보 없음'}</Text>
                <Text style={s.date}>{new Date(note.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
              </View>
            </View>
            <View style={s.actions}>
              <Pressable onPress={detail.toggleSaved} disabled={note.isMine || detail.saving} accessibilityRole="button"
                accessibilityLabel={note.isMine ? '내 쪽지' : note.isSaved ? '저장 취소' : '저장하기'}
                accessibilityState={{ disabled: note.isMine || detail.saving, busy: detail.saving }}
                style={({ pressed }) => [s.action, s.save, (pressed || note.isMine || detail.saving) && s.dimmed]}>
                {detail.saving ? <ActivityIndicator color="#0E0E0E" /> : <Image source={ASSETS.bookmark} style={s.icon22} contentFit="contain" accessible={false} />}
                <Text style={s.actionText}>{note.isMine ? '내 쪽지' : note.isSaved ? '저장 취소' : '저장하기'}</Text>
              </Pressable>
              <Pressable disabled accessibilityRole="button" accessibilityLabel="공유하기" accessibilityState={{ disabled: true }} style={[s.action, s.share]}>
                <Image source={ASSETS.share} style={s.icon22} contentFit="contain" accessible={false} />
                <Text style={[s.actionText, s.white]}>공유하기</Text>
              </Pressable>
            </View>
        </> : null}
      </View>
      <Toast visible={focused} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.88)' },
  content: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' },
  icon20: { width: 20, height: 20 }, icon22: { width: 22, height: 22 },
  paper: { flex: 1, minHeight: 0, marginVertical: 20, backgroundColor: '#EEE6D3', overflow: 'hidden', transform: [{ rotate: '-1.5deg' }] },
  bodyScroll: { flex: 1 },
  bodyContent: { padding: 22 },
  body: { fontFamily: 'NanumPen', fontSize: 25, lineHeight: 34, color: '#1C1C1E' },
  fallback: { fontFamily: 'NotoSansKR-Regular', fontSize: 18, lineHeight: 28 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 62, borderRadius: 18, backgroundColor: '#2C2C2E', borderWidth: 1, borderColor: '#FFFFFF14' },
  locationText: { flex: 1, minWidth: 0 },
  address: { fontFamily: 'NotoSansKR-Bold', fontSize: 14, lineHeight: 22, color: '#FFFFFF', letterSpacing: -0.2 },
  date: { fontFamily: 'NotoSansKR-Medium', fontSize: 12, lineHeight: 18, color: '#8E8E93', letterSpacing: -0.2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: { flex: 1, minHeight: 60, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  save: { backgroundColor: '#D6F65A' }, share: { backgroundColor: '#2350FF' },
  actionText: { fontFamily: 'NotoSansKR-Bold', fontSize: 17, color: '#0E0E0E', flexShrink: 1 },
  white: { color: '#FFFFFF' }, dimmed: { opacity: 0.65 },
  status: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
});
