package com.yeoginamgim.auth.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class EmailVerificationRepository {
	private final JdbcTemplate jdbc;
	public EmailVerificationRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

	public record Verification(UUID id, String codeHash, Instant expiresAt, int attempts,
		String tokenHash, Instant verifiedUntil) { }

	public boolean reserve(String email, UUID id, String codeHash, Instant now) {
		return jdbc.update("""
			INSERT INTO app.email_verifications
			    (email, verification_id, code_hash, requested_at, expires_at)
			VALUES (?, ?, ?, ?, ?)
			ON CONFLICT (email) DO UPDATE SET
			    verification_id = EXCLUDED.verification_id, code_hash = EXCLUDED.code_hash,
			    requested_at = EXCLUDED.requested_at, expires_at = EXCLUDED.expires_at,
			    attempts = 0, verification_token_hash = NULL, verified_until = NULL
			WHERE app.email_verifications.requested_at <= ?
			""", email, id, codeHash, Timestamp.from(now), Timestamp.from(now.plusSeconds(300)),
			Timestamp.from(now.minusSeconds(60))) == 1;
	}

	public Optional<Verification> lock(String email) {
		return jdbc.query("SELECT * FROM app.email_verifications WHERE email = ? FOR UPDATE", (rs, row) -> {
			Timestamp until = rs.getTimestamp("verified_until");
			return new Verification(rs.getObject("verification_id", UUID.class), rs.getString("code_hash"),
				rs.getTimestamp("expires_at").toInstant(), rs.getInt("attempts"),
				rs.getString("verification_token_hash"), until == null ? null : until.toInstant());
		}, email).stream().findFirst();
	}

	public void fail(String email) {
		jdbc.update("UPDATE app.email_verifications SET attempts = attempts + 1 WHERE email = ?", email);
	}
	public void confirm(String email, String tokenHash, Instant until) {
		jdbc.update("""
			UPDATE app.email_verifications SET verification_token_hash = ?, verified_until = ?
			WHERE email = ?
			""", tokenHash, Timestamp.from(until), email);
	}
	public void consume(String email) {
		jdbc.update("DELETE FROM app.email_verifications WHERE email = ?", email);
	}
}
