package com.yeoginamgim.notification.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class NearbyNotificationRepository {
	private final JdbcTemplate jdbcTemplate;

	public NearbyNotificationRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public boolean existsWithinRadius(double latitude, double longitude) {
		return Boolean.TRUE.equals(jdbcTemplate.queryForObject("""
			SELECT EXISTS (
				SELECT 1 FROM app.notes n
				WHERE public.ST_DWithin(
					n.location,
					public.ST_SetSRID(public.ST_MakePoint(?, ?), 4326)::public.geography,
					500.0
				)
			)
			""", Boolean.class, longitude, latitude));
	}
}
