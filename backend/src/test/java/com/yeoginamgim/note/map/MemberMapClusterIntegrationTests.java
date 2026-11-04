package com.yeoginamgim.note.map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.domain.NoteVisibility;

class MemberMapClusterIntegrationTests extends MemberMapTestSupport {
	@Test
	void moreThanTenThousandNotesAreCountedWithoutTruncation() throws Exception {
		jdbc.update("""
			INSERT INTO app.notes (id, author_user_id, content, latitude, longitude, visibility, created_at)
			SELECT gen_random_uuid(), ?, '많은쪽지', 35 + (i % 20) * 0.0001,
			    129 + (i % 30) * 0.0001, 'PUBLIC', now() FROM generate_series(1, 10001) AS i
			""", stranger.getId());
		var response = data(clusters("ALL", Map.of()).andExpect(status().isOk())
			.andExpect(header().string("Cache-Control", "no-store"))
			.andExpect(jsonPath("$.data.totalCount").value(10001)));
		assertThat(response.get("clusters").size()).isBetween(1, 64);
		long sum = 0;
		for (var cluster : response.get("clusters")) sum += cluster.get("count").asLong();
		assertThat(sum).isEqualTo(10001);
		assertThat(response.has("hasNext")).isFalse();
	}

	@Test
	void visibilityFiltersAndFriendRemovalApplyBeforeCounting() throws Exception {
		note(me, NoteVisibility.PRIVATE, 0, "내비공개");
		note(me, NoteVisibility.FRIENDS, 0, "내친구공개");
		note(friend, NoteVisibility.FRIENDS, 0, "친구공개");
		note(friend, NoteVisibility.PUBLIC, 0, "전체공개");
		note(friend, NoteVisibility.PRIVATE, 0, "숨김");
		note(stranger, NoteVisibility.PUBLIC, 0, "타인공개");
		note(stranger, NoteVisibility.FRIENDS, 0, "비친구숨김");
		note(stranger, NoteVisibility.PRIVATE, 0, "비공개숨김");
		clusters("ALL", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(5));
		clusters("MINE", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(2));
		clusters("FRIENDS", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(1));
		jdbc.update("DELETE FROM app.friendships WHERE user_low = ? OR user_high = ?", me.getId(), me.getId());
		clusters("ALL", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(4));
		clusters("FRIENDS", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(0));
	}

	@Test
	void singleAndMultipleMarkersDoNotExposeContentOrAuthors() throws Exception {
		at(35, 129); at(35, 129);
		var single = at(35.009, 129.009);
		var response = data(clusters("ALL", Map.of()).andExpect(status().isOk()));
		assertThat(response.get("clusters").size()).isEqualTo(2);
		for (var cluster : response.get("clusters")) {
			for (String field : java.util.List.of("content", "preview", "authorUserId", "nickname")) {
				assertThat(cluster.has(field)).isFalse();
			}
			if (cluster.get("count").asLong() == 1) {
				assertThat(cluster.get("noteId").asText()).isEqualTo(single.getId().toString());
			} else {
				assertThat(cluster.get("count").asLong()).isEqualTo(2);
				assertThat(cluster.get("noteId").isNull()).isTrue();
				assertThat(cluster.get("latitude").asDouble()).isEqualTo(35);
			}
		}
	}

	@Test
	void inclusiveBoundsAndZeroWidthViewportWork() throws Exception {
		at(34.99, 128.99); at(35.01, 129.01); at(35.011, 129.01);
		clusters("ALL", Map.of("gridSize", "1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(2)).andExpect(jsonPath("$.data.clusters.length()").value(1))
			.andExpect(jsonPath("$.data.clusters[0].minLatitude").value(34.99))
			.andExpect(jsonPath("$.data.clusters[0].maxLatitude").value(35.01));
		clusters("ALL", Map.of("minLatitude", "35.01", "maxLatitude", "35.01",
			"minLongitude", "129.01", "maxLongitude", "129.01")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(1));
	}

	@Test
	void worldViewportIncludesPolesAndMaximumGrid() throws Exception {
		at(-90, -180); at(90, 180);
		clusters("ALL", Map.of("minLatitude", "-90", "maxLatitude", "90",
			"minLongitude", "-180", "maxLongitude", "180", "gridSize", "32"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(2))
			.andExpect(jsonPath("$.data.clusters.length()").value(2));
	}

	@Test
	void emptyMapIsZeroAndUnavailableSavedSourceIsNotZero() throws Exception {
		clusters("ALL", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(0))
			.andExpect(jsonPath("$.data.clusters").isEmpty());
		clusters("SAVED", Map.of()).andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.error.code").value("MAP_DATA_UNAVAILABLE"));
	}

	@Test
	void invalidBoundsFilterAndGridAreRejected() throws Exception {
		for (var extra : java.util.List.of(Map.of("gridSize", "0"), Map.of("gridSize", "33"),
			Map.of("gridSize", "abc"), Map.of("minLatitude", "91"), Map.of("minLatitude", "NaN"),
			Map.of("maxLongitude", "Infinity"), Map.of("minLatitude", "36"),
			Map.of("minLongitude", "130"), Map.of("filter", "UNKNOWN"))) {
			clusters("ALL", extra).andExpect(status().isBadRequest());
		}
		mvc.perform(get("/api/v1/notes/clusters").header("Authorization", "Bearer " + token))
			.andExpect(status().isBadRequest());
	}

	@Test
	void missingInvalidRefreshGuestAndRevokedTokensAreRejected() throws Exception {
		mvc.perform(get("/api/v1/notes/clusters").param("minLatitude", "34.99").param("maxLatitude", "35.01")
			.param("minLongitude", "128.99").param("maxLongitude", "129.01")).andExpect(status().isUnauthorized());
		for (String invalid : java.util.List.of("invalid", sessions.open(me.getId()).refreshToken(), guests.create().guestToken())) {
			mvc.perform(get("/api/v1/notes/clusters").header("Authorization", "Bearer " + invalid)
				.param("minLatitude", "34.99").param("maxLatitude", "35.01")
				.param("minLongitude", "128.99").param("maxLongitude", "129.01"))
				.andExpect(status().isUnauthorized());
		}
		jdbc.update("UPDATE app.member_auth_sessions SET revoked_at = now() WHERE user_id = ?", me.getId());
		clusters("ALL", Map.of()).andExpect(status().isUnauthorized());
	}

	@Test
	void legacyNotesAreNeverIncludedInCounts() throws Exception {
		notes.saveAndFlush(Note.create(UUID.randomUUID(), guests.create().guestId(), "이전비회원", 35, 129, Instant.now()));
		clusters("ALL", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(0));
	}

	private Note at(double latitude, double longitude) {
		return notes.saveAndFlush(Note.createMember(UUID.randomUUID(), stranger.getId(), "공개쪽지",
			latitude, longitude, Instant.now(), NoteVisibility.PUBLIC, null, null, null));
	}

	private ResultActions clusters(String filter, Map<String, String> extra) throws Exception {
		var request = get("/api/v1/notes/clusters").header("Authorization", "Bearer " + token);
		Map<String, String> params = new HashMap<>(Map.of("minLatitude", "34.99", "minLongitude", "128.99",
			"maxLatitude", "35.01", "maxLongitude", "129.01", "filter", filter));
		params.putAll(extra);
		params.forEach(request::param);
		return mvc.perform(request);
	}
}
