import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomTabItem from './BottomTabItem';

type Props = {
  onAddPress: () => void;
};

export default function BottomTabBar({ onAddPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        <BottomTabItem
          icon={require('../../../assets/images/tabIcons/home.png')}
          label="지도"
          selected
          onPress={() => {}}
        />

        <BottomTabItem
          icon={require('../../../assets/images/tabIcons/storage.png')}
          label="보관함"
          onPress={() => {}}
        />

        <View style={styles.addSlot}>
          <Pressable style={styles.add} onPress={onAddPress} accessibilityRole="button" accessibilityLabel="쪽지 작성하기">
            <Text style={styles.plus}>+</Text>
          </Pressable>
        </View>

        <BottomTabItem
          icon={require('../../../assets/images/tabIcons/friends.png')}
          label="친구"
          onPress={() => {}}
        />

        <BottomTabItem
          icon={require('../../../assets/images/tabIcons/my.png')}
          label="마이"
          onPress={() => {}}
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
    borderRadius: 22,
    backgroundColor: '#d5f743',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    color: '#111',
    fontSize: 30,
  },
});
