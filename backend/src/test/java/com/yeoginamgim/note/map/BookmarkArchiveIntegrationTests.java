package com.yeoginamgim.note.map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.yeoginamgim.bookmark.service.BookmarkQueryService;
import com.yeoginamgim.note.domain.NoteVisibility;

class BookmarkArchiveIntegrationTests extends MemberMapTestSupport {
	private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
	@Autowired private BookmarkQueryService bookmarkQueries;

	@Test
	void savingUsesSharedAccessAndImmediatelyUnlocksMapAndDetail() throws Exception {
		var target = note(stranger, NoteVisibility.PUBLIC, 350, "먼쪽지");
		save(target.getId(), "{}").andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error.code").value("LOCATION_REQUIRED"));
		save(target.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error.code").value("NOTE_LOCKED"));
		assertThat(bookmarkQueries.countSavedNotes(me.getId())).isZero();
		String nearby = "{\"latitude\":" + target.getLatitude() + ",\"longitude\":" + target.getLongitude() + "}";
		var first = data(save(target.getId(), nearby).andExpect(status().isCreated())
			.andExpect(jsonPath("$.data.isSaved").value(true)));
		var repeated = data(save(target.getId(), "{}").andExpect(status().isOk()));
		assertThat(repeated.get("savedAt").asText()).isEqualTo(first.get("savedAt").asText());
		assertThat(bookmarkQueries.countSavedNotes(me.getId())).isEqualTo(1);
		map("ALL", false).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.notes[0].isSaved").value(true))
			.andExpect(jsonPath("$.data.openableNotes[0].noteId").value(target.getId().toString()));
		map("SAVED", false).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.notes[0].noteId").value(target.getId().toString()));
		open(target.getId(), "{}").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.isSaved").value(true))
			.andExpect(jsonPath("$.data.isRead").value(true));
		mvc.perform(get("/api/v1/users/me/bookmarks").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.notes[0].noteId").value(target.getId().toString()));
		mvc.perform(delete("/api/v1/notes/{id}/bookmarks", target.getId())
			.header("Authorization", "Bearer " + token)).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.isSaved").value(false));
		open(target.getId(), "{}").andExpect(status().isForbidden());
		map("SAVED", false).andExpect(status().isOk()).andExpect(jsonPath("$.data.notes.length()").value(0));
	}

	@Test
	void onlySuccessfulDetailOpensRecordDiscoveryAndReadingNeverGrantsDistanceException() throws Exception {
		var target = note(stranger, NoteVisibility.PUBLIC, 100, "읽은쪽지");
		open(target.getId(), "{}").andExpect(status().isForbidden());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM app.note_discoveries WHERE user_id = ?", Long.class,
			me.getId())).isZero();
		open(target.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.isSaved").value(false))
			.andExpect(jsonPath("$.data.isRead").value(true));
		open(target.getId(), "{\"latitude\":36,\"longitude\":129}").andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error.code").value("NOTE_LOCKED"));
		map("ALL", false).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.notes[0].isRead").value(true))
			.andExpect(jsonPath("$.data.openableNotes.length()").value(0));
		mvc.perform(get("/api/v1/users/me/discovered-notes").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.notes[0].accessStatus").value("LOCATION_REQUIRED"))
			.andExpect(jsonPath("$.data.notes[0].preview").isEmpty());
		mvc.perform(get("/api/v1/users/me/discovered-notes").header("Authorization", "Bearer " + token)
			.param("latitude", "35").param("longitude", "129"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.notes[0].preview").value("읽은쪽지"));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM app.note_discoveries WHERE user_id = ?", Long.class,
			me.getId())).isEqualTo(1);
	}

	@Test
	void archiveUsesOriginalCreationDayAndCurrentFriendRelationship() throws Exception {
		Instant now = Instant.now();
		LocalDate day = now.atZone(SEOUL).toLocalDate();
		var mine = note(UUID.randomUUID(), me, NoteVisibility.PRIVATE, 350, "내기록", now);
		var friendPublic = note(UUID.randomUUID(), friend, NoteVisibility.PUBLIC, 10, "친구공개", now);
		var anonymous = note(UUID.randomUUID(), stranger, NoteVisibility.PUBLIC, 10, "익명공개", now);
		save(friendPublic.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isCreated());
		save(anonymous.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isCreated());
		String date = day.toString();
		mvc.perform(get("/api/v1/users/me/archive/calendar").header("Authorization", "Bearer " + token)
			.param("month", YearMonth.from(day).toString())).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.days[0].date").value(date))
			.andExpect(jsonPath("$.data.days[0].writtenCount").value(1))
			.andExpect(jsonPath("$.data.days[0].savedCount").value(2));
		var all = data(archive(date, "ALL", null).andExpect(status().isOk()));
		assertThat(ids(all.get("notes"))).containsExactlyInAnyOrder(mine.getId().toString(),
			friendPublic.getId().toString(), anonymous.getId().toString());
		archive(date, "WRITTEN", "writtenVisibility=PRIVATE").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.notes[0].noteId").value(mine.getId().toString()));
		archive(date, "SAVED", "savedCategory=FRIEND").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.notes[0].noteId").value(friendPublic.getId().toString()))
			.andExpect(jsonPath("$.data.notes.length()").value(1));
		jdbc.update("DELETE FROM app.friendships WHERE (user_low = ? AND user_high = ?) OR (user_low = ? AND user_high = ?)",
			me.getId(), friend.getId(), friend.getId(), me.getId());
		archive(date, "SAVED", "savedCategory=FRIEND").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.notes.length()").value(0));
		archive(date, "SAVED", "savedCategory=ANONYMOUS").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.notes.length()").value(2));
	}

	@Test
	void friendOnlySaveDisappearsAfterUnfriendAndCalendarUsesSeoulDateBoundary() throws Exception {
		note(UUID.randomUUID(), me, NoteVisibility.PRIVATE, 0, "전날",
			Instant.parse("2026-11-01T14:59:59Z"));
		note(UUID.randomUUID(), me, NoteVisibility.PRIVATE, 0, "다음날",
			Instant.parse("2026-11-01T15:00:00Z"));
		var friendOnly = note(friend, NoteVisibility.FRIENDS, 10, "친구만");
		save(friendOnly.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isCreated());
		assertThat(bookmarkQueries.countSavedNotes(me.getId())).isEqualTo(1);
		mvc.perform(get("/api/v1/users/me/archive/calendar").header("Authorization", "Bearer " + token)
			.param("month", "2026-11")).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.days[0].date").value("2026-11-01"))
			.andExpect(jsonPath("$.data.days[1].date").value("2026-11-02"));
		jdbc.update("DELETE FROM app.friendships WHERE (user_low = ? AND user_high = ?) OR (user_low = ? AND user_high = ?)",
			me.getId(), friend.getId(), friend.getId(), me.getId());
		assertThat(bookmarkQueries.countSavedNotes(me.getId())).isZero();
		mvc.perform(get("/api/v1/users/me/bookmarks").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.notes.length()").value(0));
		map("SAVED", false).andExpect(status().isOk()).andExpect(jsonPath("$.data.notes.length()").value(0));
		open(friendOnly.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isNotFound());
	}

	@Test
	void bookmarkAndArchiveRejectOwnNoteInvalidFiltersAndMissingMemberToken() throws Exception {
		var mine = note(me, NoteVisibility.PRIVATE, 0, "내쪽지");
		save(mine.getId(), "{}").andExpect(status().isBadRequest());
		mvc.perform(get("/api/v1/users/me/archive/notes").header("Authorization", "Bearer " + token)
			.param("date", LocalDate.now(SEOUL).toString()).param("type", "ALL")
			.param("savedCategory", "FRIEND")).andExpect(status().isBadRequest());
		mvc.perform(get("/api/v1/users/me/bookmarks")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/v1/users/me/archive/calendar").header("Authorization", "Bearer " + token)
			.param("month", "2026-13"))
			.andExpect(status().isBadRequest());
	}

	private ResultActions save(UUID noteId, String body) throws Exception {
		return mvc.perform(post("/api/v1/notes/{id}/bookmarks", noteId)
			.header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body));
	}

	private ResultActions archive(String date, String type, String subfilter) throws Exception {
		var request = get("/api/v1/users/me/archive/notes").header("Authorization", "Bearer " + token)
			.param("date", date).param("type", type);
		if (subfilter != null) {
			String[] parts = subfilter.split("=", 2);
			request.param(parts[0], parts[1]);
		}
		return mvc.perform(request);
	}
}
