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

	public record Invitation(UUID id, UUID inviterId, String nickname, Instant expiresAt, UUID acceptedBy, boolean reusable) {}

	public void lockOwner(UUID userId) {
		jdbc.queryForObject("SELECT id FROM app.users WHERE id = ? FOR UPDATE", UUID.class, userId);
	}

	public Optional<com.yeoginamgim.friend.dto.FriendResponses.InvitationCreated> current(UUID userId, Instant now) {
		return jdbc.query("""
			SELECT share_code, expires_at FROM app.friend_invitations
			WHERE inviter_id = ? AND share_code IS NOT NULL AND expires_at > ?
			ORDER BY expires_at DESC LIMIT 1
			""", (rs, row) -> new com.yeoginamgim.friend.dto.FriendResponses.InvitationCreated(
				rs.getString("share_code"), rs.getTimestamp("expires_at").toInstant()), userId, Timestamp.from(now))
			.stream().findFirst();
	}

	public boolean createShared(UUID id, UUID inviterId, String codeHash, String code, Instant now, Instant expiresAt) {
		return jdbc.update("""
			INSERT INTO app.friend_invitations (id, inviter_id, code_hash, share_code, created_at, expires_at)
			VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (code_hash) DO NOTHING
			""", id, inviterId, codeHash, code, Timestamp.from(now), Timestamp.from(expiresAt)) == 1;
	}

	public Optional<Invitation> find(String hash, boolean lock) {
		String sql = """
			SELECT i.id, i.inviter_id, u.nickname, i.expires_at, i.accepted_by, i.share_code
			FROM app.friend_invitations i JOIN app.users u ON u.id = i.inviter_id
			WHERE i.code_hash = ?
			""" + (lock ? " FOR UPDATE OF i" : "");
		return jdbc.query(sql, (rs, row) -> new Invitation(rs.getObject("id", UUID.class),
			rs.getObject("inviter_id", UUID.class), rs.getString("nickname"),
			rs.getTimestamp("expires_at").toInstant(), rs.getObject("accepted_by", UUID.class), rs.getString("share_code") != null), hash)
			.stream().findFirst();
	}

	public void accept(UUID id, UUID userId, Instant now) {
		jdbc.update("UPDATE app.friend_invitations SET accepted_by = ?, accepted_at = ? WHERE id = ?",
			userId, Timestamp.from(now), id);
	}
}
