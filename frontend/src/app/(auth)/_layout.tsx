import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const unstable_settings = { initialRouteName: 'login' };

export default function AuthLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} onLayout={() => SplashScreen.hide()}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Stack screenOptions={{ headerShown: false, statusBarStyle: 'dark', contentStyle: { backgroundColor: '#fff' } }} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
