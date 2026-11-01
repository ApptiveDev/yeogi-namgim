import { Pressable, StyleSheet, View } from 'react-native';

import { SettingsColors as C } from '@/constants/settings';

type Props = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export function SettingsSwitch({ label, value, onValueChange, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [s.touchArea, disabled && s.disabled, pressed && s.pressed]}
    >
      <View style={[s.track, value && s.trackOn]}>
        <View style={[s.thumb, value && s.thumbOn]} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  touchArea: { width: 46, minHeight: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  track: { width: 46, height: 28, borderRadius: 14, backgroundColor: C.switchOff },
  trackOn: { backgroundColor: C.lime },
  thumb: { position: 'absolute', top: 3, left: 3, width: 22, height: 22, borderRadius: 11, backgroundColor: C.surface },
  thumbOn: { left: 21, backgroundColor: C.ink },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
