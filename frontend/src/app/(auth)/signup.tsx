import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Button, Keyboard, ScrollView, Text, TextInput } from 'react-native';

import { authErrorMessage, confirmEmailVerification, requestEmailVerification, signup } from '@/api/auth';
import { ApiError } from '@/api/client';
import { authStyles as s } from '@/styles/auth.styles';
import { validateCode, validateEmail, validateSignup, type SignupValues } from '@/utils/auth-validation';

type Action = 'email' | 'code' | 'signup';
type Verification = { id: string; email: string; expiresAt: number };
type Proof = { token: string; email: string; expiresAt: number };

export default function SignupScreen() {
  const [values, setValues] = useState<SignupValues>({ email: '', code: '', nickname: '', password: '', passwordConfirm: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof SignupValues, string>>>({});
  const [message, setMessage] = useState('');
  const [verification, setVerification] = useState<Verification | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState<Action | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const verified = Boolean(proof && proof.expiresAt > now);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!verification && !proof && !resendAt) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= Math.max(resendAt, verification?.expiresAt ?? 0, proof?.expiresAt ?? 0)) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [verification, proof, resendAt]);

  function update(field: keyof SignupValues, value: string) {
    if (busy.current) return;
    const changedEmail = field === 'email' && value.trim().toLowerCase() !== values.email.trim().toLowerCase();
    if (changedEmail) { setVerification(null); setProof(null); setResendAt(0); }
    setValues((current) => ({ ...current, ...(changedEmail ? { code: '' } : {}), [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined,
      ...(field === 'password' ? { passwordConfirm: undefined } : {}),
    }));
    setMessage('');
  }

  async function submit(action: Action) {
    if (busy.current) return;
    const nextErrors = action === 'signup' ? validateSignup(values) : {
      email: validateEmail(values.email),
      ...(action === 'code' ? { code: validateCode(values.code) } : {}),
    };
    setErrors(nextErrors);
    setMessage('');
    if (Object.values(nextErrors).some(Boolean)) return;
    const email = values.email.trim().toLowerCase();
    const requestedAt = Date.now();
    if (action === 'email' && requestedAt < resendAt) return;
    if (action === 'code' && (!verification || verification.email !== email || verification.expiresAt <= requestedAt)) {
      setErrors({ code: '인증번호를 먼저 요청하거나, 만료됐다면 다시 요청해 주세요.' });
      return;
    }
    if (action === 'signup' && (!proof || proof.email !== email || proof.expiresAt <= requestedAt)) {
      setErrors({ code: '이메일 인증을 완료해 주세요. 인증이 만료됐다면 인증번호를 다시 요청해 주세요.' });
      return;
    }
    Keyboard.dismiss();
    busy.current = true;
    setPending(action);
    try {
      if (action === 'email') {
        setVerification(null);
        setProof(null);
        setValues((current) => ({ ...current, code: '' }));
        const result = await requestEmailVerification(email);
        if (!mounted.current) return;
        setVerification({ id: result.verificationId, email, expiresAt: requestedAt + result.expiresIn * 1000 });
        setResendAt(Date.now() + 60_000);
        setNow(Date.now());
        setMessage('인증번호를 보냈어요. 이메일을 확인해 주세요.');
      } else if (action === 'code') {
        const result = await confirmEmailVerification(email, verification!.id, values.code);
        if (!mounted.current) return;
        setProof({ token: result.verificationToken, email, expiresAt: requestedAt + result.expiresIn * 1000 });
        setNow(Date.now());
        setMessage('이메일 인증이 완료됐어요.');
      } else {
        await signup({ email, nickname: values.nickname, password: values.password,
          passwordConfirm: values.passwordConfirm, verificationToken: proof!.token });
        if (!mounted.current) return;
        router.dismissTo('/login');
        Alert.alert('회원가입 완료', '가입한 계정으로 로그인해 주세요.');
      }
    } catch (error) {
      if (!mounted.current) return;
      setMessage(authErrorMessage(error));
      if (action === 'email' && error instanceof ApiError && error.status === 429) {
        setResendAt(Date.now() + 60_000);
        setNow(Date.now());
      }
      if (action === 'signup' && error instanceof ApiError && error.code === 'EMAIL_VERIFICATION_INVALID') {
        setProof(null);
        setVerification(null);
      }
      if (action === 'code' && !(error instanceof ApiError)) {
        setVerification(null);
        setMessage('인증 결과를 확인하지 못했어요. 인증번호를 다시 요청해 주세요.');
      }
    } finally {
      busy.current = false;
      if (mounted.current) setPending(null);
    }
  }

  function error(field: keyof SignupValues) {
    return errors[field] ? <Text accessibilityRole="alert" style={s.error}>{errors[field]}</Text> : null;
  }

  return (
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={s.title}>회원가입</Text>
      <TextInput accessibilityLabel="이메일" placeholder="이메일" placeholderTextColor="#777" style={s.input}
        value={values.email} onChangeText={(value) => update('email', value)} editable={!pending}
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
      {error('email')}
      <Button title={pending === 'email' ? '발송 중…' : resendSeconds ? `${resendSeconds}초 후 재요청` : '인증번호 요청'}
        disabled={Boolean(pending) || resendSeconds > 0} onPress={() => { void submit('email'); }} />
      <TextInput accessibilityLabel="인증번호" placeholder="인증번호 6자리" placeholderTextColor="#777" style={s.input}
        value={values.code} onChangeText={(value) => update('code', value)} editable={!pending && !proof}
        keyboardType="number-pad" autoComplete="one-time-code" />
      {error('code')}
      <Button title={pending === 'code' ? '확인 중…' : verified ? '이메일 인증 완료' : '인증번호 확인'}
        disabled={Boolean(pending) || !verification || Boolean(proof)} onPress={() => { void submit('code'); }} />
      {verification && !proof && <Text style={s.message}>인증번호 유효 시간: {Math.max(0, Math.ceil((verification.expiresAt - now) / 1000))}초</Text>}
      {proof && <Text style={s.message}>{verified ? `가입 가능 시간: ${Math.max(0, Math.ceil((proof.expiresAt - now) / 1000))}초` : '이메일 인증이 만료됐어요. 인증번호를 다시 요청해 주세요.'}</Text>}
      <TextInput accessibilityLabel="닉네임" placeholder="닉네임 (2~20자)" placeholderTextColor="#777" style={s.input}
        value={values.nickname} onChangeText={(value) => update('nickname', value)} editable={!pending} autoCorrect={false} />
      {error('nickname')}
      <TextInput accessibilityLabel="비밀번호" placeholder="비밀번호" placeholderTextColor="#777" style={s.input}
        value={values.password} onChangeText={(value) => update('password', value)} editable={!pending}
        secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" />
      <Text style={s.message}>공백 없이 영문·숫자·특수문자를 포함한 8~64자</Text>
      {error('password')}
      <TextInput accessibilityLabel="비밀번호 확인" placeholder="비밀번호 확인" placeholderTextColor="#777" style={s.input}
        value={values.passwordConfirm} onChangeText={(value) => update('passwordConfirm', value)} editable={!pending}
        secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password"
        returnKeyType="done" onSubmitEditing={() => { void submit('signup'); }} />
      {error('passwordConfirm')}
      {pending && <ActivityIndicator accessibilityLabel="요청 처리 중" />}
      <Button title={pending === 'signup' ? '가입 중…' : '회원가입'} disabled={Boolean(pending) || !verified}
        onPress={() => { void submit('signup'); }} />
      {message && <Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text>}
      {!pending && <Link href="/login" dismissTo style={s.link}>로그인</Link>}
    </ScrollView>
  );
}
