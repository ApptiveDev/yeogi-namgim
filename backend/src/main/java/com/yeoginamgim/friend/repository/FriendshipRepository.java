package com.yeoginamgim.friend.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.yeoginamgim.friend.dto.FriendResponses.Friend;

@Repository
public class FriendshipRepository {
	private final JdbcTemplate jdbc;
	private final NamedParameterJdbcTemplate named;

	public FriendshipRepository(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
		this.named = new NamedParameterJdbcTemplate(jdbc);
	}

	public boolean create(UUID first, UUID second, Instant now) {
		// PostgreSQL UUID order is unsigned; do not use Java UUID.compareTo() to canonicalize.
		return jdbc.update("""
			INSERT INTO app.friendships (user_low, user_high, created_at)
			VALUES (LEAST(?::uuid, ?::uuid), GREATEST(?::uuid, ?::uuid), ?)
			ON CONFLICT (user_low, user_high) DO NOTHING
			""", first, second, first, second, Timestamp.from(now)) == 1;
	}

	public Set<UUID> findFriendIds(UUID userId, Set<UUID> candidates) {
		if (candidates.isEmpty()) return Set.of();
		return new HashSet<>(named.query("""
			SELECT user_high AS friend_id FROM app.friendships
			WHERE user_low = :userId AND user_high IN (:candidates)
			UNION ALL
			SELECT user_low AS friend_id FROM app.friendships
			WHERE user_high = :userId AND user_low IN (:candidates)
			""", Map.of("userId", userId, "candidates", candidates),
			(rs, row) -> rs.getObject("friend_id", UUID.class)));
	}

	public long count(UUID userId) {
		return jdbc.queryForObject("""
			SELECT (SELECT count(*) FROM app.friendships WHERE user_low = ?)
			     + (SELECT count(*) FROM app.friendships WHERE user_high = ?)
			""", Long.class, userId, userId);
	}

	public List<Friend> findFriends(UUID userId, int limit, int offset) {
		return jdbc.query("""
			SELECT u.id, u.nickname, f.created_at FROM (
			    SELECT user_high AS friend_id, created_at FROM app.friendships WHERE user_low = ?
			    UNION ALL
			    SELECT user_low AS friend_id, created_at FROM app.friendships WHERE user_high = ?
			) f JOIN app.users u ON u.id = f.friend_id
			ORDER BY f.created_at DESC, u.id DESC LIMIT ? OFFSET ?
			""", (rs, row) -> new Friend(rs.getObject("id", UUID.class), rs.getString("nickname"),
				rs.getTimestamp("created_at").toInstant()), userId, userId, limit, offset);
	}
}
