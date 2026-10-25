package com.yeoginamgim.auth.service;

import org.springframework.http.HttpStatus;

public class AuthException extends RuntimeException {
	private final HttpStatus status;
	private final String code;

	public AuthException(HttpStatus status, String code, String message) {
		super(message);
		this.status = status;
		this.code = code;
	}

	public HttpStatus getStatus() { return status; }
	public String getCode() { return code; }

	public static AuthException unauthorized() {
		return new AuthException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "인증 정보가 없거나 올바르지 않습니다.");
	}
	public static AuthException invalidVerification() {
		return new AuthException(HttpStatus.BAD_REQUEST, "EMAIL_VERIFICATION_INVALID", "이메일 인증 정보가 만료되었거나 올바르지 않습니다.");
	}
	public static AuthException duplicateEmail() {
		return new AuthException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "이미 가입된 이메일입니다.");
	}
}
