import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StartupScreen({ message, actionLabel, onAction }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fontSize = Math.min(width * 0.125, 64);

  return (
    <View style={styles.screen} accessibilityViewIsModal>
      <Image
        source={require('../../assets/images/startup-background.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        onDisplay={() => SplashScreen.hide()}
        onError={() => SplashScreen.hide()}
        accessible={false}
      />
      <Text
        style={[styles.title, {
          top: Math.max(insets.top + 32, height * 0.135),
          left: width * 0.085,
          fontSize,
          lineHeight: fontSize * 0.98,
        }]}
      >
        {'FIND\nNOTES\nNEAR YOU'}
      </Text>
      <View style={[styles.footer, { bottom: insets.bottom + 24 }]}>
        {!message && !actionLabel && <ActivityIndicator color="#3155E7" size="small" />}
        {message && <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>}
        {actionLabel && (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFill, backgroundColor: '#526FFF', zIndex: 2000 },
  title: { position: 'absolute', color: '#FFF', fontWeight: '900', letterSpacing: -1.5 },
  footer: { position: 'absolute', left: 24, right: 24, gap: 14 },
  message: { color: '#222', fontSize: 15, textAlign: 'center' },
  button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#D5F743' },
  buttonText: { color: '#111', fontSize: 17, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
