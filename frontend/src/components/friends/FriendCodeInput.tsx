import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { StorageColors as C, StorageFonts as F } from '@/constants/storage';

const CODE_LENGTH = 6;
const CELL_GAP = 6;
const MEASURE_TEXT = '0'.repeat(CODE_LENGTH);

export function FriendCodeInput() {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [pressedFilledCell, setPressedFilledCell] = useState(false);
  const [fieldWidth, setFieldWidth] = useState(0);
  const [glyphWidth, setGlyphWidth] = useState(0);
  const [caretOpacity] = useState(() => new Animated.Value(1));
  const displayCode = value.toUpperCase();
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

  useEffect(() => {
    if (emptyCaretCell < 0) return;

    caretOpacity.setValue(1);
    const blink = Animated.loop(Animated.timing(caretOpacity, {
      toValue: 0,
      duration: 1000,
      easing: (progress) => progress < 0.5 ? 0 : 1,
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    }));
    blink.start();
    return () => blink.stop();
  }, [emptyCaretCell, caretOpacity]);

  return (
    <View style={s.field} onLayout={(event) => setFieldWidth(event.nativeEvent.layout.width)}>
      <TextInput
        accessibilityLabel="친구 코드 입력"
        accessibilityHint="영문 대문자와 숫자 6자리"
        allowFontScaling={false}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect={false}
        caretHidden={Platform.OS !== 'android' || value.length > 0}
        cursorColor="transparent"
        spellCheck={false}
        underlineColorAndroid="transparent"
        selectionColor={C.blue}
        maxLength={CODE_LENGTH}
        value={value}
        onChangeText={(text) => {
          setPressedFilledCell(false);
          setValue(text.replace(/[^A-Za-z0-9]/g, ''));
        }}
        onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        onPointerDown={Platform.OS === 'web' ? (event) => markPressedCell(event.nativeEvent.offsetX) : undefined}
        onPressIn={Platform.OS !== 'web' ? (event) => markPressedCell(event.nativeEvent.locationX) : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setPressedFilledCell(false);
        }}
        returnKeyType="done"
        style={[s.inputFont, s.input, { left: inputLeft, width: inputWidth, letterSpacing }]}
      />
      <View style={s.row} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text allowFontScaling={false} style={[s.inputFont, s.measure]}
          onLayout={(event) => setGlyphWidth(event.nativeEvent.layout.width / CODE_LENGTH)}>
          {MEASURE_TEXT}
        </Text>
        {Array.from({ length: CODE_LENGTH }, (_, index) => {
          const character = displayCode[index];
          const selected = focused && index >= selection.start && index < selection.end;
          return (
            <View key={index} style={[s.cell, character && s.filled, (index === activeCell || selected) && s.active]}>
              {character ? <Text style={s.character}>{character}</Text> : null}
              {index === emptyCaretCell ? <Animated.View style={[s.caret, { opacity: caretOpacity }]} /> : null}
            </View>
          );
        })}
      </View>
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
  character: { fontFamily: F.display, fontSize: 20, lineHeight: 26, color: C.ink, includeFontPadding: false },
  caret: { width: 2, height: 22, backgroundColor: C.blue },
  inputFont: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 20, includeFontPadding: false },
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
