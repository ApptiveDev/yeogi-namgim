import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TextInput, View, type TextInputSelectionChangeEvent } from 'react-native';

import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/colors';
import { FRIEND_INVITATION_CODE_LENGTH as CODE_LENGTH, LEGACY_FRIEND_INVITATION_CODE_LENGTH, normalizeInvitationCode } from '@/utils/friends';

const CODE_CELLS = Array.from({ length: CODE_LENGTH }, (_, index) => index);
const CELL_GAP = 6;
const MEASURE_TEXT = '0'.repeat(CODE_LENGTH);
const IS_WEB = Platform.OS === 'web';

type Props = { value: string; onChangeCode: (value: string) => void; editable: boolean };

export function FriendCodeInput({ value, onChangeCode, editable }: Props) {
  const [focused, setFocused] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [pressedFilledCell, setPressedFilledCell] = useState(false);
  const [fieldWidth, setFieldWidth] = useState(0);
  const [glyphWidth, setGlyphWidth] = useState(0);
  const [caretOpacity] = useState(() => new Animated.Value(1));
  const legacy = value.length > CODE_LENGTH;
  const caretPosition = focused && selection.start === selection.end
    ? Math.min(selection.start, value.length) : -1;
  const emptyCaretCell = !pressedFilledCell && caretPosition === value.length && caretPosition < CODE_LENGTH
    ? caretPosition : -1;
  const activeCharacter = caretPosition > 0 && (caretPosition < value.length || pressedFilledCell);
  const activeCell = activeCharacter ? caretPosition - 1 : emptyCaretCell;

  // Match the native character advance to the distance between the visible cells.
  const cellPitch = (fieldWidth + CELL_GAP) / CODE_LENGTH;
  const letterSpacing = Math.max(0, cellPitch - glyphWidth);
  // Center each cell over the native cursor position immediately after its character.
  const inputLeft = fieldWidth ? -(cellPitch + CELL_GAP) / 2 : 0;
  const inputWidth = fieldWidth ? fieldWidth - inputLeft + CELL_GAP : '100%';

  function markPressedCell(inputX: number) {
    const x = inputX + inputLeft + CELL_GAP / 2;
    setPressedFilledCell(x >= 0 && x < value.length * cellPitch);
  }

  function changeCode(text: string) {
    setPressedFilledCell(false);
    const trimmed = text.trim();
    const allowedLength = trimmed.length <= CODE_LENGTH || trimmed.length === LEGACY_FRIEND_INVITATION_CODE_LENGTH
      || (legacy && trimmed.length < LEGACY_FRIEND_INVITATION_CODE_LENGTH);
    if (allowedLength && /^[A-Za-z0-9]*$/.test(trimmed)) {
      onChangeCode(normalizeInvitationCode(trimmed));
    }
  }

  function changeSelection(event: TextInputSelectionChangeEvent) {
    const { start, end } = event.nativeEvent.selection;
    setSelection((current) => current.start === start && current.end === end ? current : { start, end });
  }

  function blurInput() {
    setFocused(false);
    setPressedFilledCell(false);
  }

  useEffect(() => {
    if (emptyCaretCell < 0) return;

    caretOpacity.setValue(1);
    const blink = Animated.loop(Animated.timing(caretOpacity, {
      toValue: 0,
      duration: 1000,
      easing: (progress) => progress < 0.5 ? 0 : 1,
      useNativeDriver: !IS_WEB,
      isInteraction: false,
    }));
    blink.start();
    return () => blink.stop();
  }, [emptyCaretCell, caretOpacity]);

  return (
    <View style={s.field} onLayout={(event) => setFieldWidth(event.nativeEvent.layout.width)}>
      <TextInput
        accessibilityLabel="친구 코드 입력"
        accessibilityHint="영문과 숫자 6자리. 이전 16자리 코드는 붙여넣을 수 있어요."
        allowFontScaling={false}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect={false}
        caretHidden={!legacy && (Platform.OS !== 'android' || value.length > 0)}
        cursorColor={legacy ? C.blue : 'transparent'}
        spellCheck={false}
        underlineColorAndroid="transparent"
        selectionColor={C.blue}
        editable={editable}
        value={value}
        onChangeText={changeCode}
        onSelectionChange={changeSelection}
        onPointerDown={IS_WEB ? (event) => markPressedCell(event.nativeEvent.offsetX) : undefined}
        onPressIn={IS_WEB ? undefined : (event) => markPressedCell(event.nativeEvent.locationX)}
        onFocus={() => setFocused(true)}
        onBlur={blurInput}
        returnKeyType="done"
        style={[s.inputFont, legacy ? s.legacyInput : [s.input, { left: inputLeft, width: inputWidth, letterSpacing }]]}
      />
      {legacy ? null : <View style={s.row} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text allowFontScaling={false} style={[s.inputFont, s.measure]}
          onLayout={(event) => setGlyphWidth(event.nativeEvent.layout.width / CODE_LENGTH)}>
          {MEASURE_TEXT}
        </Text>
        {CODE_CELLS.map((index) => {
          const character = value[index];
          const selected = focused && index >= selection.start && index < selection.end;
          return (
            <View key={index} style={[s.cell, character && s.filled, (index === activeCell || selected) && s.active]}>
              {character ? <Text style={s.character}>{character}</Text> : null}
              {index === emptyCaretCell ? <Animated.View style={[s.caret, { opacity: caretOpacity }]} /> : null}
            </View>
          );
        })}
      </View>}
    </View>
  );
}

const s = StyleSheet.create({
  field: { width: '100%', maxWidth: 270, alignSelf: 'center', direction: 'ltr', overflow: 'hidden' },
  row: { zIndex: 1, flexDirection: 'row', gap: CELL_GAP, backgroundColor: C.surface, pointerEvents: 'none' },
  cell: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    backgroundColor: '#F2F2F2',
  },
  filled: { borderColor: C.ink, backgroundColor: C.surface },
  active: { borderWidth: 2, borderColor: C.blue },
  character: { fontFamily: FontFamilies.archivoBlack, fontSize: 20, lineHeight: 26, color: C.ink, includeFontPadding: false },
  caret: { width: 2, height: 22, backgroundColor: C.blue },
  inputFont: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 20, includeFontPadding: false },
  legacyInput: { minHeight: 52, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E5EA', color: C.ink, textAlign: 'center' },
  measure: { position: 'absolute', top: 0, left: 0, opacity: 0 },
  input: {
    position: 'absolute',
    top: 0,
    height: '100%',
    padding: 0,
    color: 'transparent',
    backgroundColor: 'transparent',
    textAlign: 'left',
    writingDirection: 'ltr',
    ...Platform.select({ web: { outlineWidth: 0 } }),
  },
});
