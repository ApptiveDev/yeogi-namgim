import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ComposeIcon } from '@/components/notes/ComposeIcon';
import { FontFamilies } from '@/constants/fonts';
import { StorageColors as C } from '@/constants/storage';

import { friendActionStyles as action } from './friendActionStyles';

export function FriendsEmptyState({ onEnterCode }: { onEnterCode: () => void }) {
  return (
    <View style={s.container}>
      <View style={s.copy}>
        <View style={s.illustration} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={s.friendSlot}><ComposeIcon name="plus" size={24} color="#C7C7CC" /></View>
          <View style={s.friendSlot}><ComposeIcon name="plus" size={24} color="#C7C7CC" /></View>
          <View style={s.friendSlot}><ComposeIcon name="plus" size={24} color="#C7C7CC" /></View>
          <Image source={require('../../../assets/images/my/cat.png')} style={s.cat} contentFit="contain" accessible={false} />
        </View>
        <Text accessibilityRole="header" style={s.title}>아직 친구가 없어요</Text>
        <Text style={s.description}>{'친구를 초대하면\n친구가 남긴 쪽지 소식이 여기 떠요'}</Text>
      </View>
      <View style={s.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          disabled
          style={[action.button, action.primary]}
        >
          <Image source={require('../../../assets/images/friends-link.svg')} style={s.linkIcon} contentFit="contain" accessible={false} />
          <Text style={[action.label, action.iconLabel]}>초대 링크 보내기</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onEnterCode}
          style={[action.button, action.secondary]}
        >
          <Text style={action.label}>코드로 추가하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1 },
  copy: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4, paddingBottom: 56 },
  illustration: { flexDirection: 'row', gap: 16, paddingTop: 27, marginBottom: 20 },
  friendSlot: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderStyle: 'dashed', borderColor: '#C7C7CC', backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  cat: { position: 'absolute', top: 4, right: -1, width: 46, height: 46, transform: [{ rotate: '12deg' }] },
  title: { fontFamily: FontFamilies.notoSansKrBold, fontSize: 20, lineHeight: 30, color: C.ink, textAlign: 'center', includeFontPadding: false },
  description: { fontFamily: FontFamilies.notoSansKrRegular, fontSize: 13, lineHeight: 20, color: '#8E8E93', textAlign: 'center', includeFontPadding: false },
  actions: { width: '100%', maxWidth: 346, alignSelf: 'center', gap: 12 },
  linkIcon: { width: 20, height: 20, flexShrink: 0 },
});
