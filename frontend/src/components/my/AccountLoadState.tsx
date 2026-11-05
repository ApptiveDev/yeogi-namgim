import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamilies } from '@/constants/fonts';
import { ScreenColors as C } from '@/constants/colors';

type Props = { loading: boolean; error: string | null; onRetry: () => void; label: string };

export function AccountLoadState({ loading, error, onRetry, label }: Props) {
  if (loading) return <ActivityIndicator style={s.status} color={C.blue} accessibilityLabel={`${label} 불러오는 중`} />;
  if (!error) return null;
  return (
    <View style={s.status}>
      <Text accessibilityRole="alert" style={s.message}>{error}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 다시 시도`} onPress={onRetry} style={s.retry}>
        <Text style={s.retryText}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  status: { marginVertical: 12, alignItems: 'center' },
  message: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 13, lineHeight: 20, color: C.ink, textAlign: 'center' },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  retryText: { fontFamily: FontFamilies.notoSansKrBold, color: C.blue, fontSize: 13 },
});
