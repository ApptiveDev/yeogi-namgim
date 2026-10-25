package com.yeoginamgim.auth.dto;

import java.time.Instant;
import java.util.UUID;

import com.yeoginamgim.user.domain.Member;

public final class AuthResponses {
	private AuthResponses() { }

	public record VerificationRequested(UUID verificationId, long expiresIn) { }
	public record EmailConfirmed(String verificationToken, long expiresIn) {
		@Override public String toString() { return "EmailConfirmed[REDACTED]"; }
	}
	public record AccessToken(String accessToken, String tokenType, long expiresIn) {
		@Override public String toString() { return "AccessToken[REDACTED]"; }
	}
	public record TokenPair(String accessToken, String tokenType, long expiresIn,
		String refreshToken, long refreshExpiresIn) {
		@Override public String toString() { return "TokenPair[REDACTED]"; }
	}
	public record LogoutResult(boolean loggedOut) { }
	public record Profile(UUID userId, String email, String nickname, Instant createdAt) {
		public static Profile from(Member member) {
			return new Profile(member.getId(), member.getEmail(), member.getNickname(), member.getCreatedAt());
		}
	}
}
