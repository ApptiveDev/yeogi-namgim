package com.yeoginamgim.auth.dto;

import java.util.Locale;
import java.util.UUID;

import org.hibernate.validator.constraints.CodePointLength;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthRequests {
	private AuthRequests() { }

	// Printable ASCII: no whitespace, and always below BCrypt's 72-byte input limit.
	public static final String PASSWORD_PATTERN =
		"^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[\\x21-\\x7E]{8,64}$";
	public static final String PASSWORD_MESSAGE =
		"비밀번호는 공백 없이 영문, 숫자, 특수문자를 각각 포함한 8~64자여야 합니다.";
	public static final String REFRESH_TOKEN_PATTERN =
		"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.[A-Za-z0-9_-]{43}";

	private static String normalizeEmail(String email) {
		return email == null ? null : email.strip().toLowerCase(Locale.ROOT);
	}

	public record RefreshRequest(
		@NotNull @Pattern(regexp = REFRESH_TOKEN_PATTERN, message = "Refresh Token 형식이 올바르지 않습니다.") String refreshToken
	) {
		@Override public String toString() { return "RefreshRequest[REDACTED]"; }
	}

	public record EmailRequest(@NotBlank @Email @Size(max = 254) String email) {
		public EmailRequest { email = normalizeEmail(email); }
	}

	public record ConfirmRequest(
		@NotBlank @Email @Size(max = 254) String email,
		@NotNull UUID verificationId,
		@NotNull @Pattern(regexp = "[0-9]{6}", message = "인증 코드는 숫자 6자리여야 합니다.") String code
	) {
		public ConfirmRequest { email = normalizeEmail(email); }
		@Override public String toString() { return "ConfirmRequest[REDACTED]"; }
	}

	public record SignupRequest(
		@NotBlank @Email @Size(max = 254) String email,
		@NotNull @Pattern(regexp = PASSWORD_PATTERN, message = PASSWORD_MESSAGE) String password,
		@NotNull @Size(max = 64) String passwordConfirm,
		@NotBlank @CodePointLength(min = 2, max = 20)
		@Pattern(regexp = "[^\\p{Cntrl}]+", message = "닉네임에 제어 문자를 사용할 수 없습니다.") String nickname,
		@NotNull @Pattern(regexp = "[A-Za-z0-9_-]{43}") String verificationToken
	) {
		public SignupRequest {
			email = normalizeEmail(email);
			nickname = nickname == null ? null : nickname.strip();
		}
		@AssertTrue(message = "비밀번호와 비밀번호 확인이 일치하지 않습니다.")
		public boolean isPasswordConfirmed() {
			return password != null && password.equals(passwordConfirm);
		}
		@Override public String toString() { return "SignupRequest[REDACTED]"; }
	}

	public record LoginRequest(
		@NotBlank @Email @Size(max = 254) String email,
		@NotNull @Pattern(regexp = "[\\x21-\\x7E]{1,64}", message = "비밀번호 형식이 올바르지 않습니다.") String password
	) {
		public LoginRequest { email = normalizeEmail(email); }
		@Override public String toString() { return "LoginRequest[REDACTED]"; }
	}
}
