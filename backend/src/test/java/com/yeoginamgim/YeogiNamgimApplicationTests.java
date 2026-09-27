package com.yeoginamgim;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class YeogiNamgimApplicationTests {
	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void contextLoads() {
	}

	@Test
	void postgisMigrationIsApplied() {
		assertThat(jdbcTemplate.queryForObject(
			"SELECT success FROM app.flyway_schema_history WHERE version = '1'", Boolean.class
		)).isTrue();
		assertThat(jdbcTemplate.queryForObject("SELECT public.postgis_lib_version()", String.class))
			.startsWith("3.6.");
	}

	@Test
	void geographyRadiusQueryUsesMeters() {
		String query = """
			SELECT public.ST_DWithin(
				public.ST_SetSRID(public.ST_MakePoint(129.0756, 35.1796), 4326)::public.geography,
				public.ST_SetSRID(public.ST_MakePoint(129.0756, 35.1806), 4326)::public.geography,
				?
			)
			""";
		assertThat(jdbcTemplate.queryForObject(query, Boolean.class, 200)).isTrue();
		assertThat(jdbcTemplate.queryForObject(query, Boolean.class, 50)).isFalse();
	}

}
