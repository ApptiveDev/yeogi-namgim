package com.yeoginamgim.friend.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import com.yeoginamgim.friend.dto.FriendActivityResponse.Activity;

@Repository
public class FriendActivityRepository {
	private final JdbcTemplate jdbc;

	public FriendActivityRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

	public List<Activity> find(UUID userId, int limit, int offset) {
		return jdbc.query("""
			SELECT n.id AS note_id, u.id AS friend_id, u.nickname,
			       n.place_name, n.neighborhood, n.created_at
			FROM (
			    SELECT user_high AS friend_id FROM app.friendships WHERE user_low = ?
			    UNION ALL
			    SELECT user_low AS friend_id FROM app.friendships WHERE user_high = ?
			) f
			JOIN app.users u ON u.id = f.friend_id
			JOIN app.notes n ON n.author_user_id = u.id
			WHERE n.visibility = 'FRIENDS'
			ORDER BY n.created_at DESC, n.id DESC
			LIMIT ? OFFSET ?
			""", (rs, row) -> new Activity(rs.getObject("note_id", UUID.class),
				rs.getObject("friend_id", UUID.class), rs.getString("nickname"),
				rs.getString("place_name"), rs.getString("neighborhood"),
				rs.getTimestamp("created_at").toInstant()), userId, userId, limit, offset);
	}
}
