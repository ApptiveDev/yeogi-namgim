import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScreenColors as C } from '@/constants/colors';

export function MyHeader() {
  return (
    <View style={s.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="설정"
        accessibilityHint="설정 화면으로 이동합니다"
        onPress={() => router.push('/settings')}
        style={({ pressed }) => [s.settings, pressed && s.pressed]}
      >
        <Image source={require('../../../assets/images/my/settings.svg')} style={s.settingsIcon} contentFit="contain" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  header: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  settings: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { width: 24, height: 24 },
  pressed: { opacity: 0.7 },
});
