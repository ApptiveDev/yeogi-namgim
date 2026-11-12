import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ScreenColors as C } from '@/constants/colors';

export function MyHeader({ refreshing }: { refreshing: boolean }) {
  return (
    <View style={s.header}>
      {refreshing ? <LoadingSpinner color={C.blue} accessibilityLabel="마이페이지 새로고침 중" /> : null}
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
  header: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  settings: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { width: 24, height: 24 },
  pressed: { opacity: 0.7 },
});
