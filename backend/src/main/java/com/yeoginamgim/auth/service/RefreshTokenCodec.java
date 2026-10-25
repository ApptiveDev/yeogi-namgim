package com.yeoginamgim.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

import com.yeoginamgim.auth.dto.AuthRequests;

public class RefreshTokenCodec {
	private final SecureRandom random = new SecureRandom();

	public record Parsed(UUID sessionId, String hash) { }

	public String issue(UUID sessionId) {
		byte[] bytes = new byte[32];
		random.nextBytes(bytes);
		return sessionId + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	public Parsed parse(String token) {
		if (token == null || !token.matches(AuthRequests.REFRESH_TOKEN_PATTERN)) {
			throw AuthException.unauthorized();
		}
		return new Parsed(UUID.fromString(token.substring(0, 36)), hash(token));
	}

	public String hash(String token) {
		try {
			return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
				.digest(token.getBytes(StandardCharsets.US_ASCII)));
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 algorithm is unavailable");
		}
	}

	public boolean matches(String expected, String actual) {
		return MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),
			actual.getBytes(StandardCharsets.US_ASCII));
	}
}
