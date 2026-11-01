import { StyleSheet } from 'react-native';

export const authStyles = StyleSheet.create({
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, color: '#111' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#999', padding: 12, fontSize: 16, color: '#111' },
  error: { color: '#b00020', fontSize: 13 },
  message: { color: '#555', fontSize: 14 },
  link: { paddingVertical: 12, color: '#1769aa', textAlign: 'center' },
});
