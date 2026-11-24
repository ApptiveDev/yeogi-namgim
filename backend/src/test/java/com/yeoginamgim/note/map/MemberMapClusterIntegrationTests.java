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
	void publicClustersApplyTheSameMultiTagFilterAsMarkers() throws Exception {
		var cafe = note(stranger, NoteVisibility.PUBLIC, 0, "카페");
		var memory = note(friend, NoteVisibility.PUBLIC, 0, "추억");
		var legacy = note(stranger, NoteVisibility.PUBLIC, 0, "기존");
		var hidden = note(friend, NoteVisibility.FRIENDS, 0, "비공개");
		jdbc.update("UPDATE app.notes SET tag = 'CAFE' WHERE id = ?", cafe.getId());
		jdbc.update("UPDATE app.notes SET tag = 'MEMORY' WHERE id = ?", memory.getId());
		jdbc.update("UPDATE app.notes SET tag = 'CAFE' WHERE id = ?", hidden.getId());
		clusters("PUBLIC", Map.of("tags", "CAFE,MEMORY"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(2));
		clusters("PUBLIC", Map.of()).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(3));
		clusters("FRIENDS", Map.of("tags", "CAFE")).andExpect(status().isBadRequest());
		clusters("PUBLIC", Map.of("tags", "WRONG")).andExpect(status().isBadRequest());
	}

	@Test
	void moreThanTenThousandNotesAreCountedWithoutTruncation() throws Exception {
		jdbc.update("""
			WITH inserted AS (
				INSERT INTO app.notes (id, author_user_id, content, latitude, longitude, visibility, created_at)
				SELECT gen_random_uuid(), ?, '많은쪽지', 35 + (i % 20) * 0.0001,
				    129 + (i % 30) * 0.0001, 'PUBLIC', now() FROM generate_series(1, 10001) AS i
				RETURNING id
			)
			INSERT INTO app.note_bookmarks (user_id, note_id, saved_at)
			SELECT ?, id, now() FROM inserted
			""", stranger.getId(), me.getId());
		var response = data(clusters("ALL", Map.of()).andExpect(status().isOk())
			.andExpect(header().string("Cache-Control", "no-store"))
			.andExpect(jsonPath("$.data.totalCount").value(10001)));
		assertThat(response.get("clusters").size()).isBetween(1, 64);
		long sum = 0;
		for (var cluster : response.get("clusters")) sum += cluster.get("count").asLong();
		assertThat(sum).isEqualTo(10001);
		assertThat(response.has("hasNext")).isFalse();
		clusters("SAVED", Map.of()).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(10001));
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
		clusters("FRIENDS", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(2));
		clusters("PUBLIC", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(2));
		jdbc.update("DELETE FROM app.friendships WHERE user_low = ? OR user_high = ?", me.getId(), me.getId());
		clusters("ALL", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(4));
		clusters("FRIENDS", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(1));
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
	void emptyMapAndEmptySavedMapAreZero() throws Exception {
		clusters("ALL", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(0))
			.andExpect(jsonPath("$.data.clusters").isEmpty());
		clusters("SAVED", Map.of()).andExpect(status().isOk()).andExpect(jsonPath("$.data.totalCount").value(0))
			.andExpect(jsonPath("$.data.clusters").isEmpty());
	}

	@Test
	void savedClustersContainOnlyCurrentUsersVisibleSavedNotes() throws Exception {
		var publicSaved = note(stranger, NoteVisibility.PUBLIC, 20, "저장한공개");
		var friendSaved = note(friend, NoteVisibility.FRIENDS, 30, "저장한친구");
		var hiddenSaved = note(stranger, NoteVisibility.PRIVATE, 40, "저장돼도숨김");
		var otherUsersSaved = note(stranger, NoteVisibility.PUBLIC, 45, "다른회원저장");
		note(stranger, NoteVisibility.PUBLIC, 50, "저장안함");
		bookmark(publicSaved, friendSaved, hiddenSaved);
		jdbc.update("INSERT INTO app.note_bookmarks (user_id, note_id, saved_at) VALUES (?, ?, now())",
			friend.getId(), otherUsersSaved.getId());

		clusters("SAVED", Map.of()).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(2));
		jdbc.update("DELETE FROM app.friendships WHERE user_low = ? OR user_high = ?", me.getId(), me.getId());
		clusters("SAVED", Map.of()).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(1))
			.andExpect(jsonPath("$.data.clusters[0].noteId").value(publicSaved.getId().toString()));
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


	@Test
	void unreadCountsUseCurrentViewerAndExcludeOwnHiddenAndOutsideNotes() throws Exception {
		var read = note(friend, NoteVisibility.FRIENDS, 10, "읽음");
		var unread = note(friend, NoteVisibility.FRIENDS, 20, "안읽음");
		note(me, NoteVisibility.FRIENDS, 30, "내쪽지");
		note(friend, NoteVisibility.PUBLIC, 40, "전체공개제외");
		note(stranger, NoteVisibility.FRIENDS, 50, "권한없음");
		note(friend, NoteVisibility.FRIENDS, 2000, "화면밖");
		markRead(me.getId(), read.getId());
		markRead(stranger.getId(), unread.getId());
		long before = jdbc.queryForObject("SELECT count(*) FROM app.note_discoveries", Long.class);
		clusters("FRIENDS", Map.of("gridSize", "1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(3))
			.andExpect(jsonPath("$.data.clusters[0].count").value(3))
			.andExpect(jsonPath("$.data.clusters[0].unreadCount").value(1));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM app.note_discoveries", Long.class)).isEqualTo(before);
		markRead(me.getId(), unread.getId());
		clusters("FRIENDS", Map.of("gridSize", "1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.clusters[0].unreadCount").value(0));
		jdbc.update("UPDATE app.notes SET visibility = 'PRIVATE' WHERE id = ?", read.getId());
		clusters("FRIENDS", Map.of("gridSize", "1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(2));
		jdbc.update("DELETE FROM app.friendships WHERE user_low = ? OR user_high = ?", me.getId(), me.getId());
		clusters("FRIENDS", Map.of("gridSize", "1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(1))
			.andExpect(jsonPath("$.data.clusters[0].unreadCount").value(0));
	}

	@Test
	void unreadCountsAreAssignedPerClusterAndPublicFilterIsSharedWithMarkers() throws Exception {
		var first = at(35, 129);
		at(35, 129);
		at(35.009, 129.009);
		markRead(me.getId(), first.getId());
		note(me, NoteVisibility.PUBLIC, 0, "내공개");
		note(me, NoteVisibility.PRIVATE, 0, "내비공개");
		note(friend, NoteVisibility.FRIENDS, 0, "친구전용");
		var response = data(clusters("PUBLIC", Map.of()).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(4)));
		assertThat(response.get("clusters").size()).isEqualTo(2);
		for (var cluster : response.get("clusters")) {
			assertThat(cluster.get("unreadCount").asLong()).isEqualTo(1);
		}
		var markers = data(map("PUBLIC", false).andExpect(status().isOk()));
		assertThat(markers.get("notes").size()).isEqualTo(response.get("totalCount").asInt());
		clusters("MINE", Map.of("gridSize", "1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.clusters[0].unreadCount").value(0));
	}


	@Test
	void savedUnreadCountsUseViewerReadStateAndRecheckVisibilityAndBounds() throws Exception {
		var read = note(friend, NoteVisibility.FRIENDS, 10, "읽은저장");
		var unread = note(stranger, NoteVisibility.PUBLIC, 20, "안읽은저장");
		var hidden = note(stranger, NoteVisibility.PRIVATE, 30, "권한없는저장");
		var outside = note(stranger, NoteVisibility.PUBLIC, 2000, "화면밖저장");
		var other = note(stranger, NoteVisibility.PUBLIC, 40, "다른회원저장");
		bookmark(read, unread, hidden, outside);
		jdbc.update("INSERT INTO app.note_bookmarks (user_id, note_id, saved_at) VALUES (?, ?, now())",
			friend.getId(), other.getId());
		markRead(me.getId(), read.getId());
		markRead(friend.getId(), unread.getId());
		long before = jdbc.queryForObject("SELECT count(*) FROM app.note_discoveries", Long.class);
		clusters("SAVED", Map.of("gridSize", "1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(2))
			.andExpect(jsonPath("$.data.clusters[0].unreadCount").value(1));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM app.note_discoveries", Long.class)).isEqualTo(before);
		markRead(me.getId(), unread.getId());
		clusters("SAVED", Map.of("gridSize", "1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.clusters[0].unreadCount").value(0));
		jdbc.update("DELETE FROM app.friendships WHERE user_low = ? OR user_high = ?", me.getId(), me.getId());
		clusters("SAVED", Map.of("gridSize", "1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(1))
			.andExpect(jsonPath("$.data.clusters[0].noteId").value(unread.getId().toString()));
		jdbc.update("UPDATE app.notes SET visibility = 'PRIVATE' WHERE id = ?", unread.getId());
		clusters("SAVED", Map.of("gridSize", "1")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(0))
			.andExpect(jsonPath("$.data.clusters").isEmpty());
	}

	private void markRead(UUID userId, UUID noteId) {
		jdbc.update("INSERT INTO app.note_discoveries (user_id, note_id, first_opened_at, last_opened_at) VALUES (?, ?, ?, ?)",
			userId, noteId, java.sql.Timestamp.from(Instant.now()), java.sql.Timestamp.from(Instant.now()));
	}

	private Note at(double latitude, double longitude) {
		return notes.saveAndFlush(Note.createMember(UUID.randomUUID(), stranger.getId(), "공개쪽지",
			latitude, longitude, Instant.now(), NoteVisibility.PUBLIC, null, null, null));
	}

	private void bookmark(Note... saved) {
		for (Note note : saved) {
			jdbc.update("INSERT INTO app.note_bookmarks (user_id, note_id, saved_at) VALUES (?, ?, now())",
				me.getId(), note.getId());
		}
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
