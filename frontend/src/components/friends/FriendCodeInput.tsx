import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { StorageColors as C, StorageFonts as F } from '@/constants/storage';

const CODE_LENGTH = 6;

function formatInput(text: string) {
  return text.replace(/[^A-Za-z0-9]/g, '').slice(0, CODE_LENGTH);
}

export function FriendCodeInput() {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [caretOpacity] = useState(() => new Animated.Value(1));
  const displayCode = value.toUpperCase();
  const activeCell = focused && value.length < CODE_LENGTH ? value.length : -1;

  useEffect(() => {
    if (activeCell < 0) return;

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
  }, [activeCell, caretOpacity]);

  return (
    <View style={s.field}>
      <TextInput
        accessibilityLabel="친구 코드 입력"
        accessibilityHint="영문 대문자와 숫자 6자리"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
        underlineColorAndroid="transparent"
        value={value}
        onChangeText={(text) => setValue(formatInput(text))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="done"
        style={s.input}
      />
      <View style={s.row} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <View key={index} style={[s.cell, displayCode[index] && s.filled, index === activeCell && s.active]}>
            {displayCode[index] ? (
              <Text style={s.character}>{displayCode[index]}</Text>
            ) : index === activeCell ? (
              <Animated.View style={[s.caret, { opacity: caretOpacity }]} />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  field: { width: '100%', maxWidth: 270, alignSelf: 'center' },
  row: { zIndex: 1, flexDirection: 'row', gap: 6, backgroundColor: C.surface },
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
  input: { ...StyleSheet.absoluteFill, padding: 0, color: 'transparent', backgroundColor: 'transparent' },
});
