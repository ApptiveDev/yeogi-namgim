import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StorageColors as C, StorageFonts as F } from '@/constants/storage';

type Props = {
  title: string;
  description: string;
  onCompose: () => void;
};

export function StorageEmptyState({ title, description, onCompose }: Props) {
  return (
    <View style={s.card}>
      <View style={s.illustration} accessible={false}>
        <View style={s.paper}>
          <View style={s.line} /><View style={s.line} /><View style={[s.line, s.shortLine]} />
        </View>
        <View style={s.plusCircle}><Text style={s.plus}>+</Text></View>
      </View>
      <Text style={s.title} accessibilityLiveRegion="polite">{title}</Text>
      <Text style={s.description}>{description}</Text>
      <Pressable onPress={onCompose} accessibilityRole="button" style={({ pressed }) => [s.button, pressed && s.pressed]}>
        <Text style={s.buttonText}>노트 남기기</Text>
        <Text style={s.buttonArrow} accessible={false}>↗</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: { alignItems: 'center', backgroundColor: C.surface, borderRadius: 24, paddingHorizontal: 20, paddingTop: 26, paddingBottom: 24, marginTop: 16, boxShadow: '0 3px 8px rgba(0, 0, 0, 0.025)' },
  illustration: { width: 70, height: 66, marginBottom: 16 },
  paper: { width: 46, height: 54, borderWidth: 1.5, borderColor: '#C9C9CF', borderRadius: 9, paddingTop: 17, paddingHorizontal: 9, gap: 6, transform: [{ rotate: '-9deg' }], backgroundColor: C.background },
  line: { height: 2, backgroundColor: '#C9C9CF', borderRadius: 1 },
  shortLine: { width: '60%' },
  plusCircle: { position: 'absolute', right: 3, bottom: 3, width: 30, height: 30, borderRadius: 15, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },
  plus: { fontSize: 25, lineHeight: 29, color: C.ink },
  title: { fontFamily: F.bold, fontSize: 16, color: C.ink, textAlign: 'center', marginBottom: 8 },
  description: { fontFamily: F.regular, fontSize: 12, lineHeight: 21, textAlign: 'center', color: C.muted },
  button: { minHeight: 44, marginTop: 18, borderRadius: 24, paddingHorizontal: 22, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', gap: 16 },
  buttonText: { fontFamily: F.bold, fontSize: 12, color: C.surface },
  buttonArrow: { fontSize: 20, color: C.lime },
  pressed: { opacity: 0.75 },
});
