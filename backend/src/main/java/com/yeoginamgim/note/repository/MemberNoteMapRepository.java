package com.yeoginamgim.note.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.yeoginamgim.note.access.LocationInput;
import com.yeoginamgim.note.domain.NoteVisibility;
import com.yeoginamgim.note.dto.NoteMapBoundsRequest;
import com.yeoginamgim.note.dto.NoteMapClusterRequest;
import com.yeoginamgim.note.dto.MemberMapClusterResponse.Cluster;

@Repository
public class MemberNoteMapRepository {
	private static final String IS_FRIEND = """
		EXISTS (SELECT 1 FROM app.friendships f
		WHERE (f.user_low = :userId AND f.user_high = n.author_user_id)
		   OR (f.user_high = :userId AND f.user_low = n.author_user_id))
		""";
	private static final String VISIBLE = "(n.author_user_id = :userId OR n.visibility = 'PUBLIC' OR (n.visibility = 'FRIENDS' AND "
		+ IS_FRIEND + "))";
	private final NamedParameterJdbcTemplate jdbc;

	public MemberNoteMapRepository(JdbcTemplate jdbc) { this.jdbc = new NamedParameterJdbcTemplate(jdbc); }

	public List<MemberMapCandidate> find(UUID userId, NoteMapBoundsRequest query) {
		String filter = filter(query.filter());
		String order = query.filter() == com.yeoginamgim.note.domain.NoteMapFilter.MINE || query.location() == null
			? "n.created_at DESC, n.id DESC" : "distance_meters ASC, n.id DESC";
		Map<String, Object> params = parameters(userId, query);
		params.put("limit", query.size() + 1);
		params.put("offset", query.page() * query.size());
		return select(query, filter, " ORDER BY " + order + " LIMIT :limit OFFSET :offset", params);
	}

	public List<MemberMapCandidate> findVisibleByIds(UUID userId, NoteMapBoundsRequest query, Set<UUID> noteIds) {
		if (noteIds.isEmpty()) return List.of();
		Map<String, Object> params = parameters(userId, query);
		params.put("noteIds", noteIds);
		return select(query, "n.id IN (:noteIds)", "", params);
	}

	public Map<UUID, Double> findDistances(LocationInput location, Set<UUID> noteIds) {
		if (location == null || noteIds.isEmpty()) return Map.of();
		Map<UUID, Double> distances = new HashMap<>();
		jdbc.query("""
			SELECT n.id, public.ST_Distance(n.location,
			 public.ST_SetSRID(public.ST_MakePoint(:longitude, :latitude), 4326)::public.geography) AS distance
			FROM app.notes n WHERE n.author_user_id IS NOT NULL AND n.id IN (:noteIds)
			""", Map.of("noteIds", noteIds, "latitude", location.latitude(), "longitude", location.longitude()),
			(org.springframework.jdbc.core.RowCallbackHandler) rs ->
				distances.put(rs.getObject("id", UUID.class), rs.getDouble("distance")));
		return distances;
	}

	/** Aggregate in SQL before any pagination; at most gridSize squared rows leave the DB. */
	public List<Cluster> findClusters(UUID userId, NoteMapClusterRequest query) {
		Map<String, Object> params = parameters(userId, query.bounds());
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
				FROM app.notes n WHERE
			""" + visibleInBounds() + " AND (" + filter(query.filter()) + ")" + """
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

	private static String filter(com.yeoginamgim.note.domain.NoteMapFilter filter) {
		return switch (filter) {
			case ALL -> "TRUE";
			case FRIENDS -> "n.visibility = 'FRIENDS' AND " + IS_FRIEND;
			case MINE -> "n.author_user_id = :userId";
			case SAVED -> throw new IllegalArgumentException("Saved IDs must come from the bookmark source");
		};
	}

	private static String visibleInBounds() {
		return "n.author_user_id IS NOT NULL AND " + VISIBLE + " AND " + """
			n.location::public.geometry && public.ST_MakeEnvelope(:minLongitude, :minLatitude, :maxLongitude, :maxLatitude, 4326)
			AND n.latitude BETWEEN :minLatitude AND :maxLatitude
			AND n.longitude BETWEEN :minLongitude AND :maxLongitude
			""";
	}

	private Map<String, Object> parameters(UUID userId, NoteMapBoundsRequest query) {
		Map<String, Object> params = new HashMap<>();
		params.put("userId", userId);
		params.put("minLatitude", query.minLatitude());
		params.put("minLongitude", query.minLongitude());
		params.put("maxLatitude", query.maxLatitude());
		params.put("maxLongitude", query.maxLongitude());
		if (query.location() != null) {
			params.put("latitude", query.latitude());
			params.put("longitude", query.longitude());
		}
		return params;
	}

	private List<MemberMapCandidate> select(NoteMapBoundsRequest query, String filter, String suffix, Map<String, Object> params) {
		String distance = query.location() == null ? "NULL::double precision" : """
			public.ST_Distance(n.location,
			public.ST_SetSRID(public.ST_MakePoint(:longitude, :latitude), 4326)::public.geography)
			""";
		String sql = "SELECT n.*, u.nickname, " + distance + " AS distance_meters FROM app.notes n "
			+ "JOIN app.users u ON u.id = n.author_user_id WHERE " + visibleInBounds()
			+ " AND (" + filter + ")" + suffix;
		return jdbc.query(sql, params, (rs, row) -> new MemberMapCandidate(rs.getObject("id", UUID.class),
			rs.getObject("author_user_id", UUID.class), NoteVisibility.valueOf(rs.getString("visibility")),
			rs.getString("content"), rs.getDouble("latitude"), rs.getDouble("longitude"),
			rs.getTimestamp("created_at").toInstant(), rs.getString("color"), rs.getString("place_name"),
			rs.getString("neighborhood"), rs.getString("nickname"), rs.getObject("distance_meters", Double.class)));
	}
}
