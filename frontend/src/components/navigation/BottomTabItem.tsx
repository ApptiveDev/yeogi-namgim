import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  icon: number;
  label: string;
  labelFontFamily: string | undefined;
  selected?: boolean;
  onPress: () => void;
};

export default function BottomTabItem({
  icon,
  label,
  labelFontFamily,
  selected = false,
  onPress,
}: Props) {
  const color = selected ? '#ffffff' : '#8e8e93';

  return (
    <Pressable style={styles.item} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}>
      <Image
        source={icon}
        style={styles.icon}
        tintColor={color}
        contentFit="contain"
        accessible={false}
      />
      <Text style={[
        styles.label,
        { color },
        labelFontFamily ? { fontFamily: labelFontFamily } : styles.fallbackLabel,
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  icon: {
    width: 22,
    height: 22,
  },
  label: {
    fontSize: 10,
    lineHeight: 15,
    includeFontPadding: false,
    textAlign: 'center',
  },
  fallbackLabel: {
    fontWeight: 'bold',
  },
});
