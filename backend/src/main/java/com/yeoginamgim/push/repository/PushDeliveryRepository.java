package com.yeoginamgim.push.repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.yeoginamgim.push.domain.PushPlatform;

@Repository
public class PushDeliveryRepository {
	private static final String CANDIDATES = """
		SELECT t.id, t.platform, t.push_token,
		       public.ST_GeoHash(l.location::public.geometry, 6) AS region_key
		FROM app.push_tokens t
		JOIN app.guest_locations l ON l.guest_id = t.guest_id
		WHERE t.enabled = TRUE
		  AND l.updated_at >= ?
		  AND t.id > ?
		  AND EXISTS (
		    SELECT 1 FROM app.notes n
		    WHERE public.ST_DWithin(n.location, l.location, 500.0)
		  )
		ORDER BY t.id
		LIMIT 200
		""";

	private final JdbcTemplate jdbcTemplate;

	public PushDeliveryRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public List<PushCandidate> findCandidates(Instant freshSince, UUID afterTokenId) {
		return jdbcTemplate.query(CANDIDATES, (rs, rowNum) -> new PushCandidate(
			rs.getObject("id", UUID.class),
			PushPlatform.valueOf(rs.getString("platform")),
			rs.getString("push_token"),
			rs.getString("region_key")
		), Timestamp.from(freshSince), afterTokenId);
	}

	public boolean claim(UUID tokenId, String regionKey, Instant hour) {
		return jdbcTemplate.update("""
			INSERT INTO app.push_deliveries (token_id, region_key, hour_bucket, delivered_at)
			VALUES (?, ?, ?, ?)
			ON CONFLICT DO NOTHING
			""", tokenId, regionKey, Timestamp.from(hour), Timestamp.from(Instant.now())) == 1;
	}

	public void release(UUID tokenId, String regionKey, Instant hour) {
		jdbcTemplate.update("""
			DELETE FROM app.push_deliveries
			WHERE token_id = ? AND region_key = ? AND hour_bucket = ?
			""", tokenId, regionKey, Timestamp.from(hour));
	}

	public void disable(UUID tokenId) {
		jdbcTemplate.update("UPDATE app.push_tokens SET enabled = FALSE WHERE id = ?", tokenId);
	}

	public void purgeBefore(Instant cutoff) {
		jdbcTemplate.update("DELETE FROM app.push_deliveries WHERE hour_bucket < ?", Timestamp.from(cutoff));
	}
}
