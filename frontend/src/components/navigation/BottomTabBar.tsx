import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomTabItem from './BottomTabItem';

const LABEL_FONT_FAMILY = 'NotoSansKR-Bold';
const LABEL_FONTS = {
  [LABEL_FONT_FAMILY]: require('../../../assets/fonts/NotoSansKR-Bold.otf'),
};

type Props = {
  onAddPress: () => void;
  selectedTab?: 'home' | 'storage' | 'friends' | 'my';
};

export default function BottomTabBar({ onAddPress, selectedTab = 'home' }: Props) {
  const insets = useSafeAreaInsets();
  const [labelFontLoaded] = useFonts(LABEL_FONTS);
  const labelFontFamily = labelFontLoaded ? LABEL_FONT_FAMILY : undefined;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        <BottomTabItem
          icon={require('../../../assets/images/tabIcons/home.svg')}
          label="지도"
          labelFontFamily={labelFontFamily}
          selected={selectedTab === 'home'}
          onPress={() => { if (selectedTab !== 'home') router.dismissTo('/'); }}
        />

        <BottomTabItem
          icon={require('../../../assets/images/tabIcons/storage.svg')}
          label="보관함"
          labelFontFamily={labelFontFamily}
          selected={selectedTab === 'storage'}
          onPress={() => { if (selectedTab !== 'storage') router.navigate('/storage'); }}
        />

        <View style={styles.addSlot}>
          <Pressable style={styles.add} onPress={onAddPress} accessibilityRole="button" accessibilityLabel="쪽지 작성하기">
            <Image
              source={require('../../../assets/images/tabIcons/add.svg')}
              style={styles.addIcon}
              contentFit="contain"
              accessible={false}
            />
          </Pressable>
        </View>

        <BottomTabItem
          icon={require('../../../assets/images/tabIcons/friends.svg')}
          label="친구"
          labelFontFamily={labelFontFamily}
          selected={selectedTab === 'friends'}
          onPress={() => { if (selectedTab !== 'friends') router.navigate('/friends'); }}
        />

        <BottomTabItem
          icon={require('../../../assets/images/tabIcons/my.svg')}
          label="마이"
          labelFontFamily={labelFontFamily}
          selected={selectedTab === 'my'}
          onPress={() => { if (selectedTab !== 'my') router.navigate('/my'); }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111',
  },
  bar: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    width: 40,
    height: 40,
  },
});
