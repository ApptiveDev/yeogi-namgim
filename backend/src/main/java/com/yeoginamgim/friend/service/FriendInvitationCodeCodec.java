package com.yeoginamgim.friend.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Locale;

import org.springframework.stereotype.Component;

@Component
public class FriendInvitationCodeCodec {
	private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	private final SecureRandom random = new SecureRandom();

	public String issue() {
		StringBuilder code = new StringBuilder(16);
		for (int i = 0; i < 16; i++) code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
		return code.toString();
	}

	public String hash(String code) {
		String normalized = code == null ? "" : code.strip().toUpperCase(Locale.ROOT);
		if (!normalized.matches("[A-HJ-NP-Z2-9]{16}")) throw FriendException.invalidInvitation();
		try {
			return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
				.digest(normalized.getBytes(StandardCharsets.US_ASCII)));
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 is unavailable", exception);
		}
	}
}
