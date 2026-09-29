package com.yeoginamgim;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.guest.domain.GuestSession;
import com.yeoginamgim.guest.repository.GuestSessionRepository;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.repository.NoteMarkerProjection;
import com.yeoginamgim.note.repository.NoteRepository;
import com.yeoginamgim.location.domain.GuestLocation;
import com.yeoginamgim.location.repository.GuestLocationRepository;
import com.yeoginamgim.push.domain.PushPlatform;
import com.yeoginamgim.push.domain.PushToken;
import com.yeoginamgim.push.repository.PushDeliveryRepository;
import com.yeoginamgim.push.repository.PushTokenRepository;

@SpringBootTest
class YeogiNamgimApplicationTests {
	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private GuestSessionRepository guestSessionRepository;

	@Autowired
	private NoteRepository noteRepository;

	@Autowired
	private GuestLocationRepository guestLocationRepository;

	@Autowired
	private PushTokenRepository pushTokenRepository;

	@Autowired
	private PushDeliveryRepository pushDeliveryRepository;

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
	void guestSessionsMigrationIsApplied() {
		assertThat(jdbcTemplate.queryForObject(
			"SELECT success FROM app.flyway_schema_history WHERE version = '2'", Boolean.class
		)).isTrue();
		assertThat(jdbcTemplate.queryForObject(
			"SELECT to_regclass('app.guest_sessions') IS NOT NULL", Boolean.class
		)).isTrue();
	}

	@Test
	void notesMigrationIsAppliedWithSpatialIndex() {
		assertThat(jdbcTemplate.queryForObject(
			"SELECT success FROM app.flyway_schema_history WHERE version = '3'", Boolean.class
		)).isTrue();
		assertThat(jdbcTemplate.queryForObject(
			"SELECT to_regclass('app.notes') IS NOT NULL", Boolean.class
		)).isTrue();
		assertThat(jdbcTemplate.queryForObject(
			"SELECT to_regclass('app.idx_notes_location') IS NOT NULL", Boolean.class
		)).isTrue();
	}

	@Test
	void pushTokensMigrationIsApplied() {
		assertThat(jdbcTemplate.queryForObject(
			"SELECT to_regclass('app.push_tokens') IS NOT NULL", Boolean.class
		)).isTrue();
	}

	@Test
	@Transactional
	void nearbyPushCandidatesAndHourlyClaimUseSpatialDistance() {
		UUID guestId = UUID.randomUUID();
		guestSessionRepository.save(GuestSession.create(guestId, UUID.randomUUID().toString().replace("-", "").repeat(2), Instant.now()));
		GuestLocation location = guestLocationRepository.save(new GuestLocation(guestId, 35.1796, 129.0756, Instant.now()));
		PushToken token = pushTokenRepository.save(PushToken.create(UUID.randomUUID(), guestId,
			PushPlatform.ANDROID, "integration-device-" + UUID.randomUUID(), Instant.now()));
		noteRepository.save(Note.create(UUID.randomUUID(), guestId, "근처", 35.1806, 129.0756, Instant.now()));
		noteRepository.flush();
		guestLocationRepository.flush();
		pushTokenRepository.flush();

		var candidates = pushDeliveryRepository.findCandidates(Instant.now().minusSeconds(60), new UUID(0L, 0L));
		var candidate = candidates.stream().filter(item -> item.tokenId().equals(token.getId())).findFirst().orElseThrow();
		Instant hour = Instant.parse("2026-09-29T13:00:00Z");
		assertThat(pushDeliveryRepository.claim(token.getId(), candidate.regionKey(), hour)).isTrue();
		assertThat(pushDeliveryRepository.claim(token.getId(), candidate.regionKey(), hour)).isFalse();

		location.update(35.25, 129.2, Instant.now());
		guestLocationRepository.flush();
		assertThat(pushDeliveryRepository.findCandidates(Instant.now().minusSeconds(60), new UUID(0L, 0L)))
			.noneMatch(item -> item.tokenId().equals(token.getId()));
		location.update(35.1796, 129.0756, Instant.now());
		token.setEnabled(false);
		guestLocationRepository.flush();
		pushTokenRepository.flush();
		assertThat(pushDeliveryRepository.findCandidates(Instant.now().minusSeconds(60), new UUID(0L, 0L)))
			.noneMatch(item -> item.tokenId().equals(token.getId()));
	}

	@Test
	@Transactional
	void markerQueryReturnsOnlyNotesInsideBounds() {
		UUID guestId = UUID.randomUUID();
		guestSessionRepository.save(GuestSession.create(
			guestId,
			"a".repeat(64),
			Instant.now()
		));
		Note inside = noteRepository.save(Note.create(
			UUID.randomUUID(), guestId, "범위 안", 35.1796, 129.0756, Instant.now()
		));
		Note outside = noteRepository.save(Note.create(
			UUID.randomUUID(), guestId, "범위 밖", 35.25, 129.2, Instant.now()
		));
		noteRepository.flush();

		List<UUID> noteIds = noteRepository.findMarkersWithinBounds(
			35.17, 129.06, 35.19, 129.09
		).stream().map(NoteMarkerProjection::getNoteId).toList();

		assertThat(noteIds).contains(inside.getId()).doesNotContain(outside.getId());
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
