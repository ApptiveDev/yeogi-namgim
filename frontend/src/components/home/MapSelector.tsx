import { Image } from 'expo-image';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View } from 'react-native';

import { COMPOSE_DIM_DURATION, COMPOSE_DIM_OPACITY } from '@/components/notes/compose-transitions';
import { styles } from '@/styles/home.styles';

const MAP_OPTIONS = ['공개지도', '개인지도'] as const;

type Props = {
  isComposeOpen: boolean;
  isMapMenuOpen: boolean;
  setIsMapMenuOpen: Dispatch<SetStateAction<boolean>>;
  fontsLoaded: boolean;
  fontError: Error | null;
  insets: { top: number };
};

export function MapSelector({
  isComposeOpen, isMapMenuOpen, setIsMapMenuOpen, fontsLoaded, fontError, insets,
}: Props) {
  const selectorShadeOpacity = useRef(new Animated.Value(0)).current;
  const [selectedMap, setSelectedMap] = useState<typeof MAP_OPTIONS[number]>('공개지도');

  useEffect(() => {
    const animation = Animated.timing(selectorShadeOpacity, {
      toValue: isComposeOpen ? COMPOSE_DIM_OPACITY : 0,
      duration: COMPOSE_DIM_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [isComposeOpen, selectorShadeOpacity]);

  return (
    <>
      {isMapMenuOpen && (
        <Pressable
          style={styles.mapMenuBackdrop}
          accessibilityRole="button"
          accessibilityLabel="지도 선택 메뉴 닫기"
          onPress={() => setIsMapMenuOpen(false)}
        />
        )}

        {/* 공개지도, 개인지도 메뉴 */}
      {(fontsLoaded || fontError) && (
        <View style={[styles.mapSelectorContainer, { top: insets.top + 12 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`지도 선택, ${selectedMap}`}
            accessibilityState={{ expanded: isMapMenuOpen }}
            disabled={isComposeOpen}
            onPress={() => setIsMapMenuOpen((open) => !open)}
            style={styles.mapSelector}
          >
            <Text style={[
              styles.mapSelectorLabel,
              !fontsLoaded && styles.mapSelectorFontFallback,
            ]}>
              {selectedMap}
            </Text>
            <Image
              source={require('../../../assets/images/chevron-down.svg')}
              style={styles.mapSelectorChevron}
              contentFit="contain"
            />
          </Pressable>

          {isMapMenuOpen && (
            <View style={styles.mapMenu}>
              {MAP_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedMap === option }}
                  onPress={() => {
                    setSelectedMap(option);
                    setIsMapMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.mapMenuItem,
                    (pressed || selectedMap === option) && styles.mapMenuItemSelected,
                  ]}
                >
                  <Text style={[
                    styles.mapSelectorLabel,
                    !fontsLoaded && styles.mapSelectorFontFallback,
                  ]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Animated.View
            pointerEvents="none"
            style={[styles.mapSelectorShade, { opacity: selectorShadeOpacity }]}
          />
        </View>
      )}

    </>
  );
}
