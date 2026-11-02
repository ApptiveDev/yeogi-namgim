import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Button, Keyboard, ScrollView, Text, TextInput } from 'react-native';

import { authErrorMessage } from '@/api/auth';
import { ApiError } from '@/api/client';
import { getAuthState, signIn } from '@/auth/member-session';
import { authStyles as s } from '@/styles/auth.styles';
import { validateLogin, type LoginValues } from '@/utils/auth-validation';

export default function LoginScreen() {
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginValues, string>>>({});
  const [message, setMessage] = useState(getAuthState().error ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);

  function update(field: keyof LoginValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage('');
  }

  async function submit() {
    if (submitting.current) return;
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    setMessage('');
    if (Object.values(nextErrors).some(Boolean)) return;
    Keyboard.dismiss();
    submitting.current = true;
    setIsSubmitting(true);
    try { await signIn(values.email, values.password); }
    catch (error) {
      setMessage(error instanceof ApiError && error.status === 401
        ? '이메일 또는 비밀번호가 올바르지 않아요.' : authErrorMessage(error));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={s.title}>로그인</Text>
      <TextInput accessibilityLabel="이메일" placeholder="이메일" placeholderTextColor="#777" style={s.input}
        value={values.email} onChangeText={(value) => update('email', value)} editable={!isSubmitting}
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
      {errors.email && <Text accessibilityRole="alert" style={s.error}>{errors.email}</Text>}
      <TextInput accessibilityLabel="비밀번호" placeholder="비밀번호" placeholderTextColor="#777" style={s.input}
        value={values.password} onChangeText={(value) => update('password', value)} editable={!isSubmitting}
        secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password"
        returnKeyType="done" onSubmitEditing={() => { void submit(); }} />
      {errors.password && <Text accessibilityRole="alert" style={s.error}>{errors.password}</Text>}
      {isSubmitting && <ActivityIndicator accessibilityLabel="로그인 중" />}
      <Button title={isSubmitting ? '로그인 중…' : '로그인'} disabled={isSubmitting} onPress={() => { void submit(); }} />
      {message && <Text accessibilityRole="alert" style={s.error}>{message}</Text>}
      {!isSubmitting && <Link href="/signup" push style={s.link}>회원가입</Link>}
    </ScrollView>
  );
}
