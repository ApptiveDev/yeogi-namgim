package com.yeoginamgim.auth.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.auth.config.AuthProperties;
import com.yeoginamgim.auth.dto.AuthResponses.TokenPair;
import com.yeoginamgim.auth.repository.MemberSessionRepository;

@Service
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class MemberSessionService {
	private final MemberSessionRepository sessions;
	private final RefreshTokenCodec refreshTokens;
	private final AccessTokenCodec accessTokens;
	private final Duration refreshTtl;
	private final Clock clock;

	public MemberSessionService(MemberSessionRepository sessions, RefreshTokenCodec refreshTokens,
		AccessTokenCodec accessTokens, AuthProperties properties, Clock clock) {
		this.sessions = sessions;
		this.refreshTokens = refreshTokens;
		this.accessTokens = accessTokens;
		this.refreshTtl = properties.refreshTokenTtl();
		this.clock = clock;
		if (refreshTtl == null || refreshTtl.compareTo(Duration.ofMinutes(1)) < 0
			|| refreshTtl.compareTo(Duration.ofDays(90)) > 0) {
			throw new IllegalStateException("AUTH_REFRESH_TOKEN_TTL은 1분 이상 90일 이하여야 합니다.");
		}
	}

	@Transactional
	public TokenPair open(UUID userId) {
		UUID sessionId = UUID.randomUUID();
		String refreshToken = refreshTokens.issue(sessionId);
		Instant now = clock.instant();
		Instant expiresAt = now.plus(refreshTtl);
		sessions.create(sessionId, userId, refreshTokens.hash(refreshToken), now, expiresAt);
		return pair(userId, sessionId, refreshToken, expiresAt, now);
	}

	// Commit replay-triggered revocation even when this request returns 401.
	@Transactional(noRollbackFor = AuthException.class)
	public TokenPair refresh(String token) {
		var parsed = refreshTokens.parse(token);
		var session = sessions.lock(parsed.sessionId()).orElseThrow(AuthException::unauthorized);
		Instant now = clock.instant();
		// JWT timestamps have second precision; do not issue an already-expired access token.
		if (session.revokedAt() != null || session.expiresAt().getEpochSecond() <= now.getEpochSecond()) {
			throw AuthException.unauthorized();
		}
		if (!refreshTokens.matches(session.refreshHash(), parsed.hash())) {
			if (sessions.wasUsed(session.id(), parsed.hash())) sessions.revoke(session.id(), now);
			throw AuthException.unauthorized();
		}
		String nextToken = refreshTokens.issue(session.id());
		sessions.rotate(session.id(), session.refreshHash(), refreshTokens.hash(nextToken), now);
		return pair(session.userId(), session.id(), nextToken, session.expiresAt(), now);
	}

	@Transactional
	public void logout(String token) {
		var parsed = refreshTokens.parse(token);
		sessions.lock(parsed.sessionId()).ifPresent(session -> {
			if (refreshTokens.matches(session.refreshHash(), parsed.hash())
				|| sessions.wasUsed(session.id(), parsed.hash())) {
				sessions.revoke(session.id(), clock.instant());
			}
		});
	}

	@Transactional(readOnly = true)
	public UUID authenticate(String accessToken) {
		var identity = accessTokens.decode(accessToken);
		if (!sessions.isActive(identity.sessionId(), identity.userId(), clock.instant())) {
			throw AuthException.unauthorized();
		}
		return identity.userId();
	}

	private TokenPair pair(UUID userId, UUID sessionId, String refreshToken, Instant expiresAt, Instant now) {
		var access = accessTokens.issue(userId, sessionId, expiresAt);
		return new TokenPair(access.accessToken(), access.tokenType(), access.expiresIn(), refreshToken,
			Duration.between(now, expiresAt).toSeconds());
	}
}
