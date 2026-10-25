package com.yeoginamgim.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.SecretKey;

public class VerificationCodec {
	private final SecretKey key;
	private final SecureRandom random = new SecureRandom();

	public VerificationCodec(SecretKey key) { this.key = key; }

	public String newCode() { return String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000)); }
	public String newToken() {
		byte[] bytes = new byte[32];
		random.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}
	public String codeHash(String email, UUID verificationId, String code) {
		return hash(email + ":" + verificationId + ":" + code);
	}
	public String tokenHash(String email, String token) { return hash(email + ":token:" + token); }
	public boolean matches(String expected, String actual) {
		return expected != null && actual != null && MessageDigest.isEqual(
			expected.getBytes(StandardCharsets.US_ASCII), actual.getBytes(StandardCharsets.US_ASCII));
	}
	private String hash(String value) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(key);
			return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
		} catch (GeneralSecurityException exception) {
			throw new IllegalStateException("이메일 인증 해시를 생성할 수 없습니다.");
		}
	}
}
