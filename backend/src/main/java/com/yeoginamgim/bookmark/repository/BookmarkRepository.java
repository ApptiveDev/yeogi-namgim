package com.yeoginamgim.bookmark.repository;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.yeoginamgim.bookmark.service.BookmarkMapQueryService.SavedNoteReference;
import com.yeoginamgim.note.dto.MemberMapClusterResponse.Cluster;
import com.yeoginamgim.note.dto.NoteMapBoundsRequest;
import com.yeoginamgim.note.dto.NoteMapClusterRequest;
import com.yeoginamgim.note.repository.VisibleMemberNoteSql;

@Repository
public class BookmarkRepository {
	private static final String FROM_VISIBLE = " FROM app.note_bookmarks b JOIN app.notes n ON n.id = b.note_id "
		+ "WHERE b.user_id = :userId AND n.author_user_id IS NOT NULL AND n.author_user_id <> :userId AND "
		+ VisibleMemberNoteSql.VISIBLE;
	private final NamedParameterJdbcTemplate jdbc;

	public BookmarkRepository(JdbcTemplate jdbc) { this.jdbc = new NamedParameterJdbcTemplate(jdbc); }

	public Map<UUID, Instant> findSavedAt(UUID userId, Set<UUID> noteIds) {
		if (noteIds.isEmpty()) return Map.of();
		Map<UUID, Instant> found = new HashMap<>();
		jdbc.query("SELECT note_id, saved_at FROM app.note_bookmarks WHERE user_id = :userId AND note_id IN (:noteIds)",
			Map.of("userId", userId, "noteIds", noteIds), (org.springframework.jdbc.core.RowCallbackHandler) rs ->
				found.put(rs.getObject("note_id", UUID.class), rs.getTimestamp("saved_at").toInstant()));
		return found;
	}

	public long countVisible(UUID userId) {
		return jdbc.queryForObject("SELECT count(*)" + FROM_VISIBLE, Map.of("userId", userId), Long.class);
	}

	public SaveResult insert(UUID userId, UUID noteId, Instant savedAt) {
		int inserted = jdbc.update("INSERT INTO app.note_bookmarks (user_id, note_id, saved_at) VALUES (:userId, :noteId, :savedAt) "
			+ "ON CONFLICT (user_id, note_id) DO NOTHING", Map.of("userId", userId, "noteId", noteId,
				"savedAt", java.sql.Timestamp.from(savedAt)));
		Instant persistedAt = jdbc.queryForObject("SELECT saved_at FROM app.note_bookmarks WHERE user_id = :userId AND note_id = :noteId",
			Map.of("userId", userId, "noteId", noteId), (rs, row) -> rs.getTimestamp(1).toInstant());
		return new SaveResult(persistedAt, inserted == 1);
	}

	public int delete(UUID userId, UUID noteId) {
		return jdbc.update("DELETE FROM app.note_bookmarks WHERE user_id = :userId AND note_id = :noteId",
			Map.of("userId", userId, "noteId", noteId));
	}

	public List<SavedNoteReference> findVisiblePage(UUID userId, int page, int size) {
		return jdbc.query("SELECT b.note_id, b.saved_at" + FROM_VISIBLE
			+ " ORDER BY b.saved_at DESC, b.note_id DESC LIMIT :limit OFFSET :offset",
			Map.of("userId", userId, "limit", size + 1, "offset", page * size), this::reference);
	}

	public List<SavedNoteReference> findVisibleInBounds(UUID userId, NoteMapBoundsRequest query) {
		Map<String, Object> params = new HashMap<>();
		params.put("userId", userId);
		params.put("minLatitude", query.minLatitude());
		params.put("minLongitude", query.minLongitude());
		params.put("maxLatitude", query.maxLatitude());
		params.put("maxLongitude", query.maxLongitude());
		params.put("limit", query.size() + 1);
		params.put("offset", query.page() * query.size());
		return jdbc.query("SELECT b.note_id, b.saved_at" + FROM_VISIBLE + """
			 AND n.location::public.geometry && public.ST_MakeEnvelope(:minLongitude, :minLatitude, :maxLongitude, :maxLatitude, 4326)
			 AND n.latitude BETWEEN :minLatitude AND :maxLatitude
			 AND n.longitude BETWEEN :minLongitude AND :maxLongitude
			 ORDER BY b.saved_at DESC, b.note_id DESC LIMIT :limit OFFSET :offset
			 """, params, this::reference);
	}

	/** Aggregate every currently visible saved note in bounds before any response-size limit. */
	public List<Cluster> findVisibleClusters(UUID userId, NoteMapClusterRequest query) {
		Map<String, Object> params = new HashMap<>();
		params.put("userId", userId);
		params.put("minLatitude", query.minLatitude());
		params.put("minLongitude", query.minLongitude());
		params.put("maxLatitude", query.maxLatitude());
		params.put("maxLongitude", query.maxLongitude());
		params.put("gridSize", query.gridSize());
		String sql = """
			WITH visible AS (
				SELECT n.id, n.latitude, n.longitude,
					LEAST(:gridSize - 1, GREATEST(0, COALESCE(FLOOR(
						(n.longitude - :minLongitude) / NULLIF(:maxLongitude - :minLongitude, 0)
						* :gridSize), 0)))::integer AS cell_x,
					LEAST(:gridSize - 1, GREATEST(0, COALESCE(FLOOR(
						(n.latitude - :minLatitude) / NULLIF(:maxLatitude - :minLatitude, 0)
						* :gridSize), 0)))::integer AS cell_y
			""" + FROM_VISIBLE + """
				AND n.location::public.geometry && public.ST_MakeEnvelope(:minLongitude, :minLatitude, :maxLongitude, :maxLatitude, 4326)
				AND n.latitude BETWEEN :minLatitude AND :maxLatitude
				AND n.longitude BETWEEN :minLongitude AND :maxLongitude
			)
			SELECT cell_x, cell_y, COUNT(*) AS note_count,
				AVG(latitude) AS latitude, AVG(longitude) AS longitude,
				CASE WHEN COUNT(*) = 1 THEN MIN(id::text) ELSE NULL END AS note_id,
				MIN(latitude) AS min_latitude, MIN(longitude) AS min_longitude,
				MAX(latitude) AS max_latitude, MAX(longitude) AS max_longitude
			FROM visible GROUP BY cell_x, cell_y ORDER BY cell_y, cell_x
			""";
		return jdbc.query(sql, params, (rs, row) -> new Cluster(
			rs.getInt("cell_x") + ":" + rs.getInt("cell_y"), rs.getDouble("latitude"),
			rs.getDouble("longitude"), rs.getLong("note_count"),
			rs.getString("note_id") == null ? null : UUID.fromString(rs.getString("note_id")),
			rs.getDouble("min_latitude"), rs.getDouble("min_longitude"),
			rs.getDouble("max_latitude"), rs.getDouble("max_longitude")));
	}

	private SavedNoteReference reference(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
		return new SavedNoteReference(rs.getObject("note_id", UUID.class), rs.getTimestamp("saved_at").toInstant());
	}

	public record SaveResult(Instant savedAt, boolean created) {}
}
