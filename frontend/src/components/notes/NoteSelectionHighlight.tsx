import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { NOTE_TAP_DURATION } from '@/constants/home-map';
import type { NoteMapPoint } from './NoteMapLayer';

export function NoteSelectionHighlight({ point, isInside, screenPoint }: {
  point: NoteMapPoint;
  isInside: boolean;
  screenPoint?: [number, number];
}) {
  const [progress] = useState(() => new Animated.Value(0));
  const reduceMotion = useReducedMotion();
  const baseSize = point.count >= 10000 ? 64 : point.count >= 100 ? 52 : 44;
  const selectedSize = baseSize + (isInside ? 12 : 8);
  const glowSize = selectedSize * (isInside ? 84 / 56 : 70 / 52);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1, duration: reduceMotion ? 0 : NOTE_TAP_DURATION,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  return (
    <View style={[s.container, { width: glowSize, height: glowSize }, screenPoint && {
      position: 'absolute', left: screenPoint[0] - glowSize / 2, top: screenPoint[1] - glowSize / 2,
    }]} pointerEvents="none" collapsable={false}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Image
          source={isInside ? require('../../../assets/images/map-note-selected-glow.png') : require('../../../assets/images/map-note-outside-ring.png')}
          style={{ width: glowSize, height: glowSize }} contentFit="contain" accessible={false}
        />
      </Animated.View>
      {isInside && <Animated.View style={[StyleSheet.absoluteFill, {
        opacity: progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0] }),
        transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [baseSize / glowSize, 1.2] }) }],
      }]}>
        <Image source={require('../../../assets/images/map-note-tap-pulse.png')} style={{ width: glowSize, height: glowSize }} contentFit="contain" accessible={false} />
      </Animated.View>}
      <Animated.View style={[s.circle, isInside ? s.inside : s.outside, {
        width: selectedSize, height: selectedSize,
        borderRadius: progress.interpolate({ inputRange: [0, 1], outputRange: [selectedSize / 2, selectedSize * 22 / (isInside ? 56 : 52)] }),
        transform: [{ scale: progress.interpolate({ inputRange: [0, 0.65, 1], outputRange: [baseSize / selectedSize, (selectedSize - 2) / selectedSize, 1] }) }],
      }]} />
      <Text style={[s.count, { color: isInside ? '#0E0E0E' : '#FFFFFF' }]}>{point.count}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  circle: { position: 'absolute' },
  inside: { borderWidth: 2.5, borderColor: '#0E0E0E', backgroundColor: '#D6F65A', boxShadow: '2px 2px 0px #000000' },
  outside: { borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#2350FF', boxShadow: '0px 4px 10px rgba(36, 79, 255, 0.35)' },
  count: { fontFamily: 'Pretendard-Bold', fontSize: 17, includeFontPadding: false },
});
