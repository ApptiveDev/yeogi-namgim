import { Image } from 'expo-image';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import {
  ActivityIndicator, BackHandler, Keyboard, KeyboardAvoidingView,
  Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NoteCreateRequest } from '@/api/types';
import { NoteVisibilityPicker } from '@/components/notes/NoteVisibilityPicker';

export interface NoteDraft { content: string; visibility: NoteCreateRequest['visibility'] }
export const INITIAL_NOTE_DRAFT: NoteDraft = { content: '', visibility: 'PUBLIC' };
// Repeat at whole 18px cells so the exported grid joins without gaps.
const GRID_TILE_WIDTH = 324;
const GRID_TILE_HEIGHT = 378;
const A = {
  grid: require('../../../assets/images/note-compose/grid.svg'),
  close: require('../../../assets/images/note-compose/close.svg'),
  arrow: require('../../../assets/images/note-compose/arrow.svg'),
  pin: require('../../../assets/images/note-compose/pin.svg'),
};
const STICKERS = [
  require('../../../assets/images/stickers/sparkle.png'),
  require('../../../assets/images/stickers/cherry.png'),
  require('../../../assets/images/stickers/disc.png'),
  require('../../../assets/images/stickers/cat.png'),
  require('../../../assets/images/stickers/clover.png'),
  require('../../../assets/images/stickers/smiley.png'),
];
const TOOLS = [
  { label: '글씨', image: require('../../../assets/images/note-compose/text.svg') },
  { label: '사진', image: require('../../../assets/images/note-compose/photo.svg') },
  { label: '스티커', image: require('../../../assets/images/note-compose/sticker.svg') },
  { label: '종이', image: require('../../../assets/images/note-compose/paper.svg') },
  { label: '테이프', image: require('../../../assets/images/note-compose/tape.svg') },
];

export interface NoteComposeSheetProps {
  draft: NoteDraft;
  locationLabel: string;
  locationReady: boolean;
  placeName: string;
  onPlaceNameChange: (value: string) => void;
  onChange: Dispatch<SetStateAction<NoteDraft>>;
  onClose: () => void;
  onSubmit: (draft: NoteDraft) => void;
  isSubmitting: boolean;
}

export function NoteComposeSheet({
  draft, locationLabel, locationReady, placeName, onPlaceNameChange, onChange, onClose, onSubmit, isSubmitting,
}: NoteComposeSheetProps) {
  const insets = useSafeAreaInsets();
  const [confirmedPlaceName, setConfirmedPlaceName] = useState<string | null>(null);
  const placeChanged = confirmedPlaceName !== null && placeName !== confirmedPlaceName;
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [paperSize, setPaperSize] = useState({ width: 0, height: 0 });
  const canSubmit = locationReady && Boolean(draft.content.trim()) && !isSubmitting;
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => back.remove();
  }, [onClose]);

  return (
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} accessibilityViewIsModal>
      <View style={[s.content, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
        <View style={s.header}>
          <Pressable onPress={onClose} disabled={isSubmitting} accessibilityRole="button" accessibilityLabel="작성 화면 닫기" accessibilityState={{ disabled: isSubmitting }} style={s.close}>
            <Image source={A.close} style={s.icon20} contentFit="contain" />
          </Pressable>
          <Pressable onPress={() => onSubmit(draft)} disabled={!canSubmit} accessibilityRole="button" accessibilityLabel="쪽지 남기기" accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }} style={[s.submit, !canSubmit && s.disabled]}>
            {isSubmitting ? <ActivityIndicator color="#0E0E0E" /> : <><Text style={s.submitText}>남기기</Text><Image source={A.arrow} style={s.icon16} contentFit="contain" /></>}
          </Pressable>
        </View>
        <NoteVisibilityPicker value={draft.visibility} disabled={isSubmitting}
          onChange={(visibility) => onChange((previous) => ({ ...previous, visibility }))} />
        <View style={s.paperArea}>
          <View style={s.paper}>
            <View pointerEvents="none" style={s.grid} onLayout={(event) => setPaperSize(event.nativeEvent.layout)} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: Math.ceil(paperSize.height / GRID_TILE_HEIGHT) }, (_, row) =>
                Array.from({ length: Math.ceil(paperSize.width / GRID_TILE_WIDTH) }, (_, column) =>
                  <View key={`${row}-${column}`} style={[s.gridTile, { left: column * GRID_TILE_WIDTH, top: row * GRID_TILE_HEIGHT }]}>
                    <Image source={A.grid} style={s.gridImage} contentFit="fill" accessible={false} />
                  </View>))}
            </View>
            <TextInput accessibilityLabel="쪽지 내용" value={draft.content} onChangeText={(content) => onChange((previous) => ({ ...previous, content }))}
              placeholder="이 장소에 남길 이야기를 적어주세요." placeholderTextColor="#8C8577" multiline scrollEnabled maxLength={500}
              editable={!isSubmitting} textAlignVertical="top" selectionColor="#D6F65A" style={s.input} />
            <Text style={s.count}>{draft.content.length} / 500</Text>
          </View>
          <View pointerEvents="none" style={s.tape} />
        </View>
        <View style={s.location}>
          <Image source={A.pin} style={s.icon20} contentFit="contain" accessible={false} />
          <View style={s.locationText}>
            <TextInput accessibilityLabel="장소명" value={placeName} onChangeText={(value) => {
              setConfirmedPlaceName((previous) => previous ?? placeName);
              onPlaceNameChange(value);
            }}
              editable={!isSubmitting} placeholder={locationLabel} placeholderTextColor="#8E8E93" maxLength={200}
              onSubmitEditing={() => Keyboard.dismiss()}
              returnKeyType="done" underlineColorAndroid="transparent" style={s.placeName} />
            <Text style={s.caption}>현재 위치에 남겨져요</Text>
          </View>
          <Pressable onPress={() => { setConfirmedPlaceName(placeName); Keyboard.dismiss(); }} disabled={isSubmitting} accessibilityRole="button" accessibilityLabel="장소명 변경" style={s.change}>
            <Text style={[s.changeText, placeChanged && s.changeTextActive]}>변경</Text>
          </Pressable>
        </View>
        {!keyboardOpen && <View style={s.toolsArea}>
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.toolsContent}>
            <View style={s.panel}>
              <View style={s.panelHeader}><Text style={s.panelTitle}>STICKERS</Text><Text style={s.panelCaption}>탭해서 붙이기 · 드래그로 이동</Text></View>
              <View style={s.stickers}>{STICKERS.map((source, index) => <View key={index} style={s.cell}><Image source={source} style={s.sticker} contentFit="contain" /></View>)}</View>
            </View>
            <View style={s.dock}>{TOOLS.map((tool) => <View key={tool.label} style={s.tool}><Image source={tool.image} tintColor="#FFFFFF" style={s.icon24} contentFit="contain" /><Text style={s.toolLabel}>{tool.label}</Text></View>)}</View>
          </View>
          <View style={s.comingSoon} accessibilityLabel="꾸미기 도구 준비 중"><Text style={s.comingSoonText}>COMING SOON</Text></View>
        </View>}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 30, backgroundColor: 'rgba(0,0,0,0.88)' },
  content: { flex: 1, paddingHorizontal: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(44,44,46,0.85)', alignItems: 'center', justifyContent: 'center' },
  submit: { minWidth: 91, height: 40, borderRadius: 24, backgroundColor: '#D6F65A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 14 },
  submitText: { fontFamily: 'NotoSansKR-Bold', fontSize: 15, color: '#0E0E0E' },
  disabled: { opacity: 0.5 },
  icon16: { width: 16, height: 16 }, icon20: { width: 20, height: 20 }, icon24: { width: 24, height: 24 },
  paperArea: { flex: 1, minHeight: 80, marginTop: 12, marginBottom: 20, marginHorizontal: 8 },
  paper: { flex: 1, backgroundColor: '#EEE6D3', transformOrigin: 'center top', transform: [{ rotate: '1.5deg' }], shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 9, elevation: 8 },
  grid: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  gridTile: { position: 'absolute', width: GRID_TILE_WIDTH, height: GRID_TILE_HEIGHT, overflow: 'hidden' },
  gridImage: { width: 329.5, height: 392.5 },
  input: { flex: 1, paddingHorizontal: 22, paddingTop: 36, paddingBottom: 24, fontFamily: 'NanumPen', fontSize: 23, lineHeight: 31, color: '#1C1C1E' },
  count: { position: 'absolute', right: 12, bottom: 6, fontSize: 10, color: '#8C8577' },
  tape: { position: 'absolute', left: 4, top: -4, width: 86, height: 26, backgroundColor: '#3A6FD8', transform: [{ rotate: '-10deg' }] },
  location: { height: 48, flexShrink: 0, borderRadius: 16, backgroundColor: '#2C2C2E', flexDirection: 'row', alignItems: 'center', paddingLeft: 14, marginBottom: 12, gap: 8 },
  locationText: { flex: 1, minWidth: 0 },
  placeName: { height: 20, padding: 0, fontFamily: 'NotoSansKR-Bold', fontSize: 14, lineHeight: 20, includeFontPadding: false, textAlignVertical: 'center', color: '#FFF' },
  caption: { fontFamily: 'NotoSansKR-Medium', fontSize: 11, lineHeight: 16, includeFontPadding: false, color: '#8E8E93' },
  change: { minWidth: 54, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  changeText: { fontFamily: 'NotoSansKR-Bold', fontSize: 13, color: '#8E8E93' },
  changeTextActive: { color: '#D6F65A' },
  toolsArea: { height: 190 }, toolsContent: { opacity: 0.35 },
  panel: { height: 116, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#1C1C1E', overflow: 'hidden', paddingTop: 12 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginBottom: 12 },
  panelTitle: { fontFamily: 'NotoSansKR-Bold', fontSize: 12, color: '#FFF', letterSpacing: 0.5 },
  panelCaption: { fontFamily: 'NotoSansKR-Medium', fontSize: 11, color: '#8E8E93' },
  stickers: { flexDirection: 'row', gap: 6, paddingHorizontal: 11 },
  cell: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  sticker: { width: 42, height: 42 },
  dock: { height: 64, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.9)', flexDirection: 'row', marginTop: 10, padding: 5 },
  tool: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  toolLabel: { fontFamily: 'NotoSansKR-Bold', fontSize: 10, color: '#FFF' },
  comingSoon: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,14,14,0.35)', alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  comingSoonText: { color: '#D6F65A', fontFamily: 'NotoSansKR-Bold', fontSize: 20, letterSpacing: 2 },
});
