package com.yeoginamgim.archive.repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.yeoginamgim.archive.dto.ArchiveCalendarResponse.Day;
import com.yeoginamgim.archive.dto.ArchiveNotesRequest;
import com.yeoginamgim.archive.service.ArchiveCursor;
import com.yeoginamgim.note.repository.VisibleMemberNoteSql;

@Repository
public class ArchiveRepository {
	private static final String WRITTEN = """
		SELECT n.id AS note_id, n.created_at, NULL::timestamptz AS saved_at, 'WRITTEN' AS source
		FROM app.notes n WHERE n.author_user_id = :userId
		AND n.created_at >= :startAt AND n.created_at < :endAt
		""";
	private static final String SAVED = """
		SELECT n.id AS note_id, n.created_at, b.saved_at, 'SAVED' AS source
		FROM app.note_bookmarks b JOIN app.notes n ON n.id = b.note_id
		WHERE b.user_id = :userId AND n.author_user_id IS NOT NULL
		AND n.author_user_id <> :userId AND n.created_at >= :startAt AND n.created_at < :endAt
		AND """ + VisibleMemberNoteSql.VISIBLE;
	private final NamedParameterJdbcTemplate jdbc;

	public ArchiveRepository(JdbcTemplate jdbc) { this.jdbc = new NamedParameterJdbcTemplate(jdbc); }

	public List<Day> calendar(UUID userId, Instant startAt, Instant endAt) {
		String sql = "SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, "
			+ "count(*) FILTER (WHERE source = 'WRITTEN') AS written_count, "
			+ "count(*) FILTER (WHERE source = 'SAVED') AS saved_count FROM ("
			+ WRITTEN + " UNION ALL " + SAVED + ") entries GROUP BY day ORDER BY day";
		return jdbc.query(sql, Map.of("userId", userId, "startAt", java.sql.Timestamp.from(startAt),
			"endAt", java.sql.Timestamp.from(endAt)),
			(rs, row) -> new Day(rs.getObject("day", LocalDate.class), rs.getLong("written_count"),
				rs.getLong("saved_count")));
	}

	public List<Entry> find(UUID userId, Instant startAt, Instant endAt, ArchiveNotesRequest request,
		ArchiveCursor.Position cursor) {
		String written = WRITTEN;
		if (request.writtenVisibility() != null && request.writtenVisibility() != ArchiveNotesRequest.WrittenVisibility.ALL) {
			written += " AND n.visibility = :visibility";
		}
		String saved = SAVED;
		if (request.savedCategory() == ArchiveNotesRequest.SavedCategory.FRIEND) {
			saved += " AND " + VisibleMemberNoteSql.CURRENT_FRIEND;
		} else if (request.savedCategory() == ArchiveNotesRequest.SavedCategory.ANONYMOUS) {
			saved += " AND NOT (" + VisibleMemberNoteSql.CURRENT_FRIEND + ")";
		}
		String source = switch (request.type()) {
			case ALL -> written + " UNION ALL " + saved;
			case WRITTEN -> written;
			case SAVED -> saved;
		};
		String sql = "SELECT * FROM (" + source + ") entries";
		if (cursor != null) {
			sql += " WHERE (created_at < :cursorCreatedAt OR (created_at = :cursorCreatedAt AND note_id < :cursorNoteId))";
		}
		sql += " ORDER BY created_at DESC, note_id DESC LIMIT :limit";
		Map<String, Object> params = new HashMap<>();
		params.put("userId", userId);
		params.put("startAt", java.sql.Timestamp.from(startAt));
		params.put("endAt", java.sql.Timestamp.from(endAt));
		params.put("limit", request.size() + 1);
		if (cursor != null) {
			params.put("cursorCreatedAt", java.sql.Timestamp.from(cursor.createdAt()));
			params.put("cursorNoteId", cursor.noteId());
		}
		if (request.writtenVisibility() != null && request.writtenVisibility() != ArchiveNotesRequest.WrittenVisibility.ALL) {
			params.put("visibility", request.writtenVisibility().name());
		}
		return jdbc.query(sql, params, (rs, row) -> new Entry(rs.getObject("note_id", UUID.class),
			rs.getTimestamp("created_at").toInstant(), rs.getString("source"), rs.getTimestamp("saved_at") == null ? null
				: rs.getTimestamp("saved_at").toInstant()));
	}

	public record Entry(UUID noteId, Instant createdAt, String source, Instant savedAt) {}
}
