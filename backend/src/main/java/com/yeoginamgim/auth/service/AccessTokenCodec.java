package com.yeoginamgim.auth.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import com.yeoginamgim.auth.dto.AuthResponses.AccessToken;

public class AccessTokenCodec {
	private static final String AUDIENCE = "yeogi-namgim-member-api";
	private final NimbusJwtEncoder encoder;
	private final NimbusJwtDecoder decoder;
	private final String issuer;
	private final Duration ttl;
	private final Clock clock;

	public AccessTokenCodec(SecretKey key, String issuer, Duration ttl, Clock clock) {
		this.issuer = issuer;
		this.ttl = ttl;
		this.clock = clock;
		this.encoder = NimbusJwtEncoder.withSecretKey(key).algorithm(MacAlgorithm.HS256).build();
		this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
		JwtTimestampValidator timestamps = new JwtTimestampValidator(Duration.ZERO);
		timestamps.setClock(clock);
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(timestamps, new JwtIssuerValidator(issuer)));
	}

	public record Identity(UUID userId, UUID sessionId) { }

	public AccessToken issue(UUID userId, UUID sessionId) {
		return issue(userId, sessionId, null);
	}

	public AccessToken issue(UUID userId, UUID sessionId, Instant sessionExpiresAt) {
		Instant now = clock.instant();
		Instant expiresAt = now.plus(ttl);
		if (sessionExpiresAt != null && sessionExpiresAt.isBefore(expiresAt)) expiresAt = sessionExpiresAt;
		JwtClaimsSet claims = JwtClaimsSet.builder().issuer(issuer).subject(userId.toString())
			.audience(List.of(AUDIENCE)).issuedAt(now).expiresAt(expiresAt)
			.id(UUID.randomUUID().toString()).claim("token_use", "access").claim("sid", sessionId.toString()).build();
		return new AccessToken(encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue(),
			"Bearer", expiresAt.getEpochSecond() - now.getEpochSecond());
	}

	public UUID identify(String token) {
		return decode(token).userId();
	}

	public Identity decode(String token) {
		try {
			Jwt jwt = decoder.decode(token);
			if (!"access".equals(jwt.getClaimAsString("token_use")) || jwt.getSubject() == null
				|| jwt.getAudience() == null || !jwt.getAudience().contains(AUDIENCE)
				|| jwt.getExpiresAt() == null || !clock.instant().isBefore(jwt.getExpiresAt())
				|| jwt.getIssuedAt() == null || jwt.getIssuedAt().isAfter(clock.instant())) {
				throw AuthException.unauthorized();
			}
			String sessionId = jwt.getClaimAsString("sid");
			if (sessionId == null) throw AuthException.unauthorized();
			return new Identity(UUID.fromString(jwt.getSubject()), UUID.fromString(sessionId));
		} catch (JwtException | IllegalArgumentException exception) {
			throw AuthException.unauthorized();
		}
	}
}
