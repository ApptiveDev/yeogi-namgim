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

class ArchiveIntegrationTests extends MemberMapTestSupport {
	private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
	@Autowired private BookmarkQueryService bookmarkQueries;

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
