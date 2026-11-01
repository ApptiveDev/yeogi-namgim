package com.yeoginamgim.note.discovery;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.yeoginamgim.note.repository.VisibleMemberNoteSql;

@Repository
public class NoteDiscoveryRepository {
	private final NamedParameterJdbcTemplate jdbc;

	public NoteDiscoveryRepository(JdbcTemplate jdbc) { this.jdbc = new NamedParameterJdbcTemplate(jdbc); }

	public void recordOpen(UUID userId, UUID noteId, Instant openedAt) {
		jdbc.update("""
			INSERT INTO app.note_discoveries (user_id, note_id, first_opened_at, last_opened_at)
			VALUES (:userId, :noteId, :openedAt, :openedAt)
			ON CONFLICT (user_id, note_id) DO UPDATE SET
			last_opened_at = GREATEST(app.note_discoveries.last_opened_at, EXCLUDED.last_opened_at)
			""", Map.of("userId", userId, "noteId", noteId, "openedAt", java.sql.Timestamp.from(openedAt)));
	}

	public Set<UUID> findReadNoteIds(UUID userId, Set<UUID> noteIds) {
		if (noteIds.isEmpty()) return Set.of();
		return new HashSet<>(jdbc.query("SELECT note_id FROM app.note_discoveries WHERE user_id = :userId "
			+ "AND note_id IN (:noteIds)", Map.of("userId", userId, "noteIds", noteIds),
			(rs, row) -> rs.getObject(1, UUID.class)));
	}

	public List<DiscoveryReference> findVisiblePage(UUID userId, int page, int size) {
		String sql = "SELECT d.note_id, d.first_opened_at, d.last_opened_at FROM app.note_discoveries d "
			+ "JOIN app.notes n ON n.id = d.note_id WHERE d.user_id = :userId AND n.author_user_id IS NOT NULL "
			+ "AND n.author_user_id <> :userId AND " + VisibleMemberNoteSql.VISIBLE
			+ " ORDER BY d.last_opened_at DESC, d.note_id DESC LIMIT :limit OFFSET :offset";
		return jdbc.query(sql, Map.of("userId", userId, "limit", size + 1, "offset", page * size),
			(rs, row) -> new DiscoveryReference(rs.getObject("note_id", UUID.class),
				rs.getTimestamp("first_opened_at").toInstant(), rs.getTimestamp("last_opened_at").toInstant()));
	}

	public record DiscoveryReference(UUID noteId, Instant firstOpenedAt, Instant lastOpenedAt) {}
}
