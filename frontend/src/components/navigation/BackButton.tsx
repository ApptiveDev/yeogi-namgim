import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
};

export function BackButton({ onPress, accessibilityLabel = '뒤로가기', disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.button, (pressed || disabled) && s.dimmed]}
    >
      <Image source={require('../../../assets/images/back-chevron.svg')} style={StyleSheet.absoluteFill} contentFit="contain" accessible={false} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
  },
  dimmed: { opacity: 0.6 },
});
