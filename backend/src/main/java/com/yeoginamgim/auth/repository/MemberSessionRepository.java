package com.yeoginamgim.auth.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class MemberSessionRepository {
	private final JdbcTemplate jdbc;

	public MemberSessionRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

	public record Session(UUID id, UUID userId, String refreshHash, Instant expiresAt, Instant revokedAt) { }

	public void create(UUID id, UUID userId, String hash, Instant now, Instant expiresAt) {
		jdbc.update("""
			INSERT INTO app.member_auth_sessions(id, user_id, refresh_token_hash, created_at, expires_at)
			VALUES (?, ?, ?, ?, ?)
			""", id, userId, hash, Timestamp.from(now), Timestamp.from(expiresAt));
	}

	public Optional<Session> lock(UUID id) {
		return jdbc.query("SELECT * FROM app.member_auth_sessions WHERE id = ? FOR UPDATE", (rs, row) -> {
			Timestamp revokedAt = rs.getTimestamp("revoked_at");
			return new Session(rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class),
				rs.getString("refresh_token_hash"), rs.getTimestamp("expires_at").toInstant(),
				revokedAt == null ? null : revokedAt.toInstant());
		}, id).stream().findFirst();
	}

	public boolean isActive(UUID id, UUID userId, Instant now) {
		return Boolean.TRUE.equals(jdbc.queryForObject("""
			SELECT EXISTS (SELECT 1 FROM app.member_auth_sessions
			WHERE id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > ?)
			""", Boolean.class, id, userId, Timestamp.from(now)));
	}

	public boolean wasUsed(UUID id, String hash) {
		return Boolean.TRUE.equals(jdbc.queryForObject("""
			SELECT EXISTS (SELECT 1 FROM app.used_refresh_tokens WHERE session_id = ? AND token_hash = ?)
			""", Boolean.class, id, hash));
	}

	public void rotate(UUID id, String oldHash, String newHash, Instant now) {
		jdbc.update("INSERT INTO app.used_refresh_tokens(session_id, token_hash, used_at) VALUES (?, ?, ?)",
			id, oldHash, Timestamp.from(now));
		jdbc.update("UPDATE app.member_auth_sessions SET refresh_token_hash = ? WHERE id = ?", newHash, id);
	}

	public void revoke(UUID id, Instant now) {
		jdbc.update("UPDATE app.member_auth_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL",
			Timestamp.from(now), id);
	}
}
