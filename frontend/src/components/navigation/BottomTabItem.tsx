import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
} from 'react-native';

type Props = {
  icon: ImageSourcePropType;
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export default function BottomTabItem({
  icon,
  label,
  selected = false,
  onPress,
}: Props) {
  return (
    <Pressable style={styles.item} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Image
        source={icon}
        style={[
          styles.icon,
          { tintColor: selected ? '#fff' : '#777' },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 25,
    height: 25,
  },
});
