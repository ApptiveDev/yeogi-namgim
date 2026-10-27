package com.yeoginamgim.friend.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class FriendInvitationRepository {
	private final JdbcTemplate jdbc;

	public FriendInvitationRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

	public record Invitation(UUID id, UUID inviterId, String nickname, Instant expiresAt, UUID acceptedBy) {}

	public void create(UUID id, UUID inviterId, String codeHash, Instant now, Instant expiresAt) {
		jdbc.update("""
			INSERT INTO app.friend_invitations (id, inviter_id, code_hash, created_at, expires_at)
			VALUES (?, ?, ?, ?, ?)
			""", id, inviterId, codeHash, Timestamp.from(now), Timestamp.from(expiresAt));
	}

	public Optional<Invitation> find(String hash, boolean lock) {
		String sql = """
			SELECT i.id, i.inviter_id, u.nickname, i.expires_at, i.accepted_by
			FROM app.friend_invitations i JOIN app.users u ON u.id = i.inviter_id
			WHERE i.code_hash = ?
			""" + (lock ? " FOR UPDATE OF i" : "");
		return jdbc.query(sql, (rs, row) -> new Invitation(rs.getObject("id", UUID.class),
			rs.getObject("inviter_id", UUID.class), rs.getString("nickname"),
			rs.getTimestamp("expires_at").toInstant(), rs.getObject("accepted_by", UUID.class)), hash)
			.stream().findFirst();
	}

	public void accept(UUID id, UUID userId, Instant now) {
		jdbc.update("UPDATE app.friend_invitations SET accepted_by = ?, accepted_at = ? WHERE id = ?",
			userId, Timestamp.from(now), id);
	}
}
