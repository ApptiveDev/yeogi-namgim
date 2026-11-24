package com.yeoginamgim.archive.repository;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.yeoginamgim.archive.dto.ArchiveMapRequest;
import com.yeoginamgim.archive.dto.ArchiveMapResponse.Bounds;
import com.yeoginamgim.archive.dto.ArchiveMapResponse.Position;
import com.yeoginamgim.archive.service.ArchiveMapCursor;
import com.yeoginamgim.note.repository.VisibleMemberNoteSql;

@Repository
public class ArchiveMapRepository {
	private static final String WRITTEN = "n.author_user_id = :userId";
	private static final String SAVED = """
		EXISTS (SELECT 1 FROM app.note_bookmarks b WHERE b.user_id = :userId AND b.note_id = n.id)
		AND n.author_user_id IS NOT NULL AND n.author_user_id <> :userId AND
		""" + VisibleMemberNoteSql.VISIBLE;
	private final NamedParameterJdbcTemplate jdbc;

	public ArchiveMapRepository(JdbcTemplate jdbc) { this.jdbc = new NamedParameterJdbcTemplate(jdbc); }

	public Summary summarize(UUID userId, ArchiveMapRequest.Type type) {
		String sql = "SELECT count(*) AS total_count, min(n.latitude) AS min_latitude, "
			+ "min(n.longitude) AS min_longitude, max(n.latitude) AS max_latitude, "
			+ "max(n.longitude) AS max_longitude FROM app.notes n WHERE " + predicate(type);
		return jdbc.queryForObject(sql, Map.of("userId", userId), (rs, row) -> new Summary(
			rs.getLong("total_count"), rs.getLong("total_count") == 0 ? null : new Bounds(
				rs.getDouble("min_latitude"), rs.getDouble("min_longitude"),
				rs.getDouble("max_latitude"), rs.getDouble("max_longitude"))));
	}

	public List<Entry> page(UUID userId, ArchiveMapRequest request, ArchiveMapCursor.Position cursor) {
		String sql = "SELECT n.id, n.created_at, n.latitude, n.longitude FROM app.notes n WHERE " + predicate(request.type());
		Map<String, Object> params = new HashMap<>();
		params.put("userId", userId);
		params.put("limit", request.size() + 1);
		if (cursor != null) {
			sql += " AND (n.created_at < :cursorCreatedAt OR "
				+ "(n.created_at = :cursorCreatedAt AND n.id < :cursorNoteId))";
			params.put("cursorCreatedAt", java.sql.Timestamp.from(cursor.createdAt()));
			params.put("cursorNoteId", cursor.noteId());
		}
		sql += " ORDER BY n.created_at DESC, n.id DESC LIMIT :limit";
		return jdbc.query(sql, params, (rs, row) -> new Entry(rs.getObject("id", UUID.class),
			rs.getTimestamp("created_at").toInstant(),
			new Position(rs.getObject("id", UUID.class), rs.getDouble("latitude"), rs.getDouble("longitude"))));
	}

	private static String predicate(ArchiveMapRequest.Type type) {
		return type == ArchiveMapRequest.Type.WRITTEN ? WRITTEN : SAVED;
	}

	public record Summary(long totalCount, Bounds bounds) {}
	public record Entry(UUID noteId, Instant createdAt, Position position) {}
}
