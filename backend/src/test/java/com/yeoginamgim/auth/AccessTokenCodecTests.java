package com.yeoginamgim.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import com.yeoginamgim.auth.service.AccessTokenCodec;
import com.yeoginamgim.auth.service.AuthException;

class AccessTokenCodecTests {
	private static final Instant NOW = Instant.parse("2026-10-25T01:00:00Z");
	private static final SecretKey KEY = new SecretKeySpec("unit-test-key-32-bytes-long-value!".getBytes(), "HmacSHA256");
	private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
	private final UUID userId = UUID.randomUUID();
	private final UUID sessionId = UUID.randomUUID();
	private final AccessTokenCodec codec = new AccessTokenCodec(KEY, "yeogi-namgim", Duration.ofMinutes(15), clock);

	@Test
	void issuesMemberTokenWithFifteenMinuteExpiry() {
		var response = codec.issue(userId, sessionId);
		assertThat(response.tokenType()).isEqualTo("Bearer");
		assertThat(response.expiresIn()).isEqualTo(900);
		assertThat(codec.identify(response.accessToken())).isEqualTo(userId);
		assertThat(codec.decode(response.accessToken()).sessionId()).isEqualTo(sessionId);
		assertThat(response.toString()).doesNotContain(response.accessToken());
	}

	@Test
	void rejectsExpirationAtExactBoundaryAndWrongSigningKey() {
		String token = codec.issue(userId, sessionId).accessToken();
		AccessTokenCodec later = new AccessTokenCodec(KEY, "yeogi-namgim", Duration.ofMinutes(15),
			Clock.fixed(NOW.plusSeconds(900), ZoneOffset.UTC));
		assertThatThrownBy(() -> later.identify(token)).isInstanceOf(AuthException.class);
		SecretKey otherKey = new SecretKeySpec("different-test-key-32-bytes-long!".getBytes(), "HmacSHA256");
		String forged = new AccessTokenCodec(otherKey, "yeogi-namgim", Duration.ofMinutes(15), clock)
			.issue(userId, sessionId).accessToken();
		assertThatThrownBy(() -> codec.identify(forged)).isInstanceOf(AuthException.class);
	}

	@Test
	void rejectsGuestMalformedAndUnsignedTokens() {
		for (String token : List.of("opaque-guest-token", "not.a.jwt", "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.")) {
			assertThatThrownBy(() -> codec.identify(token)).isInstanceOf(AuthException.class);
		}
	}

	@Test
	void rejectsWrongPurposeAudienceIssuerAndFutureIssuedAt() {
		assertRejected(claims().claim("token_use", "refresh"));
		assertRejected(claims().audience(List.of("another-api")));
		assertRejected(claims().issuer("another-issuer"));
		assertRejected(claims().issuedAt(NOW.plusSeconds(1)));
		assertRejected(claims().subject("not-a-user-uuid"));
		assertRejected(claims().claim("sid", "not-a-session-uuid"));
		assertRejected(JwtClaimsSet.builder().issuer("yeogi-namgim").subject(userId.toString())
			.audience(List.of("yeogi-namgim-member-api")).issuedAt(NOW).expiresAt(NOW.plusSeconds(900))
			.claim("token_use", "access"));
		assertRejected(JwtClaimsSet.builder().issuer("yeogi-namgim").issuedAt(NOW).expiresAt(NOW.plusSeconds(900))
			.audience(List.of("yeogi-namgim-member-api")).claim("token_use", "access").claim("sid", sessionId.toString()));
		assertRejected(JwtClaimsSet.builder().issuer("yeogi-namgim").subject(userId.toString())
			.issuedAt(NOW).expiresAt(NOW.plusSeconds(900)).claim("token_use", "access").claim("sid", sessionId.toString()));
		assertRejected(JwtClaimsSet.builder().issuer("yeogi-namgim").subject(userId.toString())
			.audience(List.of("yeogi-namgim-member-api")).issuedAt(NOW).claim("token_use", "access").claim("sid", sessionId.toString()));
		assertRejected(JwtClaimsSet.builder().issuer("yeogi-namgim").subject(userId.toString())
			.audience(List.of("yeogi-namgim-member-api")).expiresAt(NOW.plusSeconds(900))
			.claim("token_use", "access").claim("sid", sessionId.toString()));
	}

	private JwtClaimsSet.Builder claims() {
		return JwtClaimsSet.builder().issuer("yeogi-namgim").subject(userId.toString())
			.audience(List.of("yeogi-namgim-member-api")).issuedAt(NOW).expiresAt(NOW.plusSeconds(900))
			.claim("token_use", "access").claim("sid", sessionId.toString());
	}

	@Test
	void accessTokenCannotOutliveItsSession() {
		var response = codec.issue(userId, sessionId, NOW.plusSeconds(60));
		assertThat(response.expiresIn()).isEqualTo(60);
		AccessTokenCodec later = new AccessTokenCodec(KEY, "yeogi-namgim", Duration.ofMinutes(15),
			Clock.fixed(NOW.plusSeconds(60), ZoneOffset.UTC));
		assertThatThrownBy(() -> later.identify(response.accessToken())).isInstanceOf(AuthException.class);
	}

	private void assertRejected(JwtClaimsSet.Builder claims) {
		String token = NimbusJwtEncoder.withSecretKey(KEY).algorithm(MacAlgorithm.HS256).build()
			.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims.build())).getTokenValue();
		assertThatThrownBy(() -> codec.identify(token)).isInstanceOf(AuthException.class);
	}
}
