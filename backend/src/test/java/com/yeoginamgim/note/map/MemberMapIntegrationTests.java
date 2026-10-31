package com.yeoginamgim.note.map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.domain.NoteVisibility;

class MemberMapIntegrationTests extends MemberMapTestSupport {
	@Test
	void allMapEnforcesVisibilityAndKeepsFriendsAnonymous() throws Exception {
		var publicNote = note(stranger, NoteVisibility.PUBLIC, 50, "공개미리보기");
		var friendPublic = note(friend, NoteVisibility.PUBLIC, 70, "친구공개");
		var friendOnly = note(friend, NoteVisibility.FRIENDS, 80, "친구전용");
		var mine = note(me, NoteVisibility.PRIVATE, 350, "내개인쪽지");
		note(friend, NoteVisibility.PRIVATE, 10, "친구비공개유출금지");
		note(stranger, NoteVisibility.FRIENDS, 20, "관계없는쪽지유출금지");
		var guest = guests.create();
		notes.saveAndFlush(Note.create(UUID.randomUUID(), guest.guestId(), "비회원", 35, 129, Instant.now()));
		var result = map("ALL", true).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
		var data = data(result);
		assertThat(ids(data.get("notes"))).containsExactly(publicNote.getId().toString(), friendPublic.getId().toString(),
			friendOnly.getId().toString(), mine.getId().toString());
		assertThat(data.get("openableNotes").size()).isEqualTo(4);
		for (var marker : data.get("notes")) {
			assertThat(marker.has("content")).isFalse();
			assertThat(marker.has("preview")).isFalse();
			assertThat(marker.has("authorUserId")).isFalse();
			assertThat(marker.get("isSaved").isNull()).isTrue();
			assertThat(marker.get("isRead").isNull()).isTrue();
		}
		for (var card : data.get("openableNotes")) assertThat(card.get("authorNickname").isNull()).isTrue();
	}

	@Test
	void friendFilterContainsOnlyFriendsVisibilityAndShowsAuthorName() throws Exception {
		var included = note(friend, NoteVisibility.FRIENDS, 120, "친구전용");
		note(friend, NoteVisibility.PUBLIC, 40, "친구의전체공개는제외");
		note(me, NoteVisibility.FRIENDS, 60, "내가친구에게쓴쪽지는내필터에서");
		note(stranger, NoteVisibility.FRIENDS, 80, "관계없음");
		var data = data(map("FRIENDS", true).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.openableNotes[0].authorNickname").value(friend.getNickname())));
		assertThat(ids(data.get("notes"))).containsExactly(included.getId().toString());
	}

	@Test
	void mineIncludesEveryVisibilityAndOpensWithoutLocation() throws Exception {
		for (NoteVisibility visibility : NoteVisibility.values()) note(me, visibility, 350, "내쪽지");
		note(stranger, NoteVisibility.PUBLIC, 0, "타인");
		var data = data(map("MINE", false).andExpect(status().isOk()));
		assertThat(data.get("notes").size()).isEqualTo(3);
		assertThat(data.get("openableNotes").size()).isEqualTo(3);
		for (var marker : data.get("notes")) {
			assertThat(marker.get("accessStatus").asText()).isEqualTo("OPENABLE");
			assertThat(marker.get("distanceMeters").isNull()).isTrue();
		}
	}

	@Test
	void lockedNotesHaveMarkersButNeverCardsOrPreview() throws Exception {
		var near = note(stranger, NoteVisibility.PUBLIC, 199.9, "범위안");
		var far = note(stranger, NoteVisibility.PUBLIC, 200.1, "잠긴본문유출금지");
		var data = data(map("ALL", true).andExpect(status().isOk()));
		assertThat(ids(data.get("notes"))).containsExactly(near.getId().toString(), far.getId().toString());
		assertThat(ids(data.get("openableNotes"))).containsExactly(near.getId().toString());
		assertThat(data.get("notes").get(1).get("accessStatus").asText()).isEqualTo("LOCKED");
		open(far.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error.code").value("NOTE_LOCKED"));
	}

	@Test
	void noLocationAllowsExplorationAndOwnCardsButNoForeignPreview() throws Exception {
		var foreign = note(stranger, NoteVisibility.PUBLIC, 0, "현재좌표없으면공개미리보기도숨김");
		var mine = note(me, NoteVisibility.PRIVATE, 300, "내쪽지는위치없이");
		var data = data(map("ALL", false).andExpect(status().isOk()));
		assertThat(data.get("notes").size()).isEqualTo(2);
		assertThat(ids(data.get("openableNotes"))).containsExactly(mine.getId().toString());
		open(foreign.getId(), "{}").andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error.code").value("LOCATION_REQUIRED"));
		open(mine.getId(), "{}").andExpect(status().isOk());
	}

	@Test
	void detailRechecksCurrentLocationAndFriendPermissionAfterListWasReturned() throws Exception {
		var target = note(friend, NoteVisibility.FRIENDS, 100, "친구쪽지");
		map("FRIENDS", true).andExpect(status().isOk()).andExpect(jsonPath("$.data.openableNotes.length()").value(1));
		open(target.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isOk());
		open(target.getId(), "{\"latitude\":36,\"longitude\":129}").andExpect(status().isForbidden());
		jdbc.update("DELETE FROM app.friendships WHERE (user_low = ? AND user_high = ?) OR (user_low = ? AND user_high = ?)",
			me.getId(), friend.getId(), friend.getId(), me.getId());
		open(target.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isNotFound());
		map("FRIENDS", true).andExpect(status().isOk()).andExpect(jsonPath("$.data.notes.length()").value(0));
	}

	@Test
	void exactBoundsAndStableDistancePagination() throws Exception {
		Instant time = Instant.parse("2026-10-28T00:00:00Z");
		var first = note(new UUID(0, 3), stranger, NoteVisibility.PUBLIC, 30, "거리동률높은ID", time);
		var second = note(new UUID(0, 2), stranger, NoteVisibility.PUBLIC, 30, "거리동률낮은ID", time);
		var third = note(new UUID(0, 1), stranger, NoteVisibility.PUBLIC, 70, "다음페이지", time);
		note(stranger, NoteVisibility.PUBLIC, 2000, "화면밖");
		var page1 = data(map("ALL", true, Map.of("size", "2")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.hasNext").value(true)));
		assertThat(ids(page1.get("notes"))).containsExactly(first.getId().toString(), second.getId().toString());
		var page2 = data(map("ALL", true, Map.of("page", "1", "size", "2")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.hasNext").value(false)));
		assertThat(ids(page2.get("notes"))).containsExactly(third.getId().toString());
	}

	@Test
	void mineSortsByCreationNotDistance() throws Exception {
		var oldNear = note(new UUID(0, 1), me, NoteVisibility.PUBLIC, 10, "오래된쪽지", Instant.parse("2026-10-26T00:00:00Z"));
		var newFar = note(new UUID(0, 2), me, NoteVisibility.PUBLIC, 350, "최신쪽지", Instant.parse("2026-10-27T00:00:00Z"));
		var data = data(map("MINE", true).andExpect(status().isOk()));
		assertThat(ids(data.get("notes"))).containsExactly(newFar.getId().toString(), oldNear.getId().toString());
	}

	@Test
	void rejectsMalformedLocationAndFilterAndPagination() throws Exception {
		for (var extra : java.util.List.of(Map.of("latitude", "35"), Map.of("accuracyMeters", "10"),
			Map.of("measuredAt", "2026-10-28T00:00:00Z"), Map.of("latitude", "NaN", "longitude", "129"),
			Map.of("latitude", "91", "longitude", "129"), Map.of("page", "-1"), Map.of("page", "10001"),
			Map.of("size", "0"), Map.of("size", "501"), Map.of("filter", "UNKNOWN"))) {
			map("ALL", false, extra).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		}
		map("ALL", true, Map.of("accuracyMeters", "-1")).andExpect(status().isBadRequest());
		map("ALL", true, Map.of("measuredAt", "wrong")).andExpect(status().isBadRequest());
		map("ALL", true, Map.of("accuracyMeters", "10", "measuredAt", "2026-10-28T00:00:00Z"))
			.andExpect(status().isOk());
	}

	@Test
	void savedFilterReportsUnconnectedSourceRatherThanPretendingEmpty() throws Exception {
		map("SAVED", true).andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.error.code").value("MAP_DATA_UNAVAILABLE"));
	}

	@Test
	void guestLegacyMapRemainsIsolatedAndRejectsMemberFilters() throws Exception {
		var guest = guests.create();
		notes.saveAndFlush(Note.create(UUID.randomUUID(), guest.guestId(), "예전쪽지", 35, 129, Instant.now()));
		note(stranger, NoteVisibility.PUBLIC, 10, "회원쪽지는비회원에게노출안함");
		String memberToken = token;
		token = guest.guestToken();
		map("ALL", false).andExpect(status().isOk()).andExpect(jsonPath("$.data.notes.length()").value(1))
			.andExpect(jsonPath("$.data.openableNotes").doesNotExist());
		map("FRIENDS", false).andExpect(status().isBadRequest());
		token = memberToken + "broken";
		map("ALL", true).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/v1/notes").param("minLatitude", "34").param("minLongitude", "128")
			.param("maxLatitude", "36").param("maxLongitude", "130")).andExpect(status().isUnauthorized());
	}

	@Test
	void wideWorldViewportIncludesBothSidesAndUsesMapRectangleSemantics() throws Exception {
		var east = notes.saveAndFlush(Note.createMember(UUID.randomUUID(), stranger.getId(), "동쪽", 35, 179,
			Instant.now(), NoteVisibility.PUBLIC, null, null, null));
		var west = notes.saveAndFlush(Note.createMember(UUID.randomUUID(), stranger.getId(), "서쪽", 35, -179,
			Instant.now(), NoteVisibility.PUBLIC, null, null, null));
		var local = note(stranger, NoteVisibility.PUBLIC, 10, "우리주변");
		var data = data(map("ALL", false, Map.of("minLatitude", "-90", "maxLatitude", "90",
			"minLongitude", "-180", "maxLongitude", "180")).andExpect(status().isOk()));
		assertThat(ids(data.get("notes"))).containsExactlyInAnyOrder(east.getId().toString(), west.getId().toString(), local.getId().toString());
		assertThat(jdbc.queryForObject("SELECT to_regclass('app.idx_notes_member_map_bounds') IS NOT NULL", Boolean.class)).isTrue();
	}

	@Test
	void viewportIncludesBoundaryPointsAndExcludesPointsOutsideExactRectangle() throws Exception {
		var corner = notes.saveAndFlush(Note.createMember(UUID.randomUUID(), stranger.getId(), "모서리", 35.01, 129.01,
			Instant.now(), NoteVisibility.PUBLIC, null, null, null));
		notes.saveAndFlush(Note.createMember(UUID.randomUUID(), stranger.getId(), "밖", 35.010001, 129.01,
			Instant.now(), NoteVisibility.PUBLIC, null, null, null));
		var data = data(map("ALL", false).andExpect(status().isOk()));
		assertThat(ids(data.get("notes"))).containsExactly(corner.getId().toString());
	}

	@Test
	void previewIsBoundedByCodePointsAndNeverCreatesNotes() throws Exception {
		String content = "😀".repeat(120);
		note(stranger, NoteVisibility.PUBLIC, 50, content);
		long before = notes.count();
		var data = data(map("ALL", true).andExpect(status().isOk()));
		String preview = data.get("openableNotes").get(0).get("preview").asText();
		assertThat(preview.codePointCount(0, preview.length())).isEqualTo(100);
		assertThat(notes.count()).isEqualTo(before);
	}
}
