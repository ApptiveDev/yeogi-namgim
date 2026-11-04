export type LoginValues = { email: string; password: string };
export type SignupValues = LoginValues & { code: string; nickname: string; passwordConfirm: string };

export function validateEmail(value: string): string | undefined {
  const email = value.trim().toLowerCase();
  if (!email) return '이메일을 입력해 주세요.';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email)) return '올바른 이메일을 입력해 주세요.';
}

export function validateCode(value: string): string | undefined {
  if (value.length !== 6 || /[^0-9]/.test(value)) return '숫자 6자리 인증번호를 입력해 주세요.';
}

export function validateNickname(value: string, maxLength = 20): string | undefined {
  const nickname = value.trim();
  const length = Array.from(nickname).length;
  if (length < 2 || length > maxLength || /[\u0000-\u001f\u007f]/.test(nickname)) {
    return `닉네임은 제어 문자 없이 2~${maxLength}자로 입력해 주세요.`;
  }
}

function isPrintablePassword(value: string, minLength: number) {
  return value.length >= minLength && value.length <= 64 && !/[^\x21-\x7E]/.test(value);
}

export function validateLogin(values: LoginValues) {
  return {
    email: validateEmail(values.email),
    password: !isPrintablePassword(values.password, 1)
      ? '비밀번호를 공백 없이 영문·숫자·특수문자로 1~64자 입력해 주세요.' : undefined,
  };
}

export function validateSignup(values: SignupValues) {
  return {
    email: validateEmail(values.email),
    code: validateCode(values.code),
    nickname: validateNickname(values.nickname),
    password: !isPrintablePassword(values.password, 8)
      || !/[A-Za-z]/.test(values.password) || !/[0-9]/.test(values.password) || !/[^A-Za-z0-9]/.test(values.password)
      ? '비밀번호는 공백 없이 영문·숫자·특수문자를 포함한 8~64자여야 해요.' : undefined,
    passwordConfirm: !values.passwordConfirm || values.password !== values.passwordConfirm
      ? '비밀번호 확인을 동일하게 입력해 주세요.' : undefined,
  };
}
