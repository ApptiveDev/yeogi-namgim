package com.yeoginamgim.note.map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.domain.NoteVisibility;

class ArchiveMapIntegrationTests extends MemberMapTestSupport {
	@Test
	void writtenIncludesEveryVisibilityAndBoundsOutsideTheFirstPage() throws Exception {
		var near = at(me.getId(), NoteVisibility.PUBLIC, 35, 129, 1);
		var far = at(me.getId(), NoteVisibility.PRIVATE, 38, 126, 3);
		at(me.getId(), NoteVisibility.FRIENDS, 36, 128, 2);
		at(stranger.getId(), NoteVisibility.PUBLIC, 40, 125, 4);
		var first = data(request("WRITTEN", "1", null).andExpect(status().isOk())
			.andExpect(header().string("Cache-Control", "no-store"))
			.andExpect(jsonPath("$.data.totalCount").value(3))
			.andExpect(jsonPath("$.data.bounds.minLatitude").value(35))
			.andExpect(jsonPath("$.data.bounds.minLongitude").value(126))
			.andExpect(jsonPath("$.data.bounds.maxLatitude").value(38))
			.andExpect(jsonPath("$.data.bounds.maxLongitude").value(129))
			.andExpect(jsonPath("$.data.notes[0].noteId").value(near.getId().toString())));
		assertThat(first.get("hasNext").asBoolean()).isTrue();
		String cursor = first.get("nextCursor").asText();
		request("WRITTEN", "1", cursor).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(3));
		request("SAVED", "1", cursor).andExpect(status().isBadRequest());
		var otherToken = sessions.open(stranger.getId()).accessToken();
		mvc.perform(get("/api/v1/users/me/archive/map").header("Authorization", "Bearer " + otherToken)
			.param("type", "WRITTEN").param("cursor", cursor)).andExpect(status().isBadRequest());
		assertThat(far.getId()).isNotNull();
	}

	@Test
	void savedRechecksOwnerFriendshipVisibilityAndDeletion() throws Exception {
		var publicSaved = at(stranger.getId(), NoteVisibility.PUBLIC, 35, 129, 1);
		var friendSaved = at(friend.getId(), NoteVisibility.FRIENDS, 36, 128, 2);
		var hidden = at(stranger.getId(), NoteVisibility.PRIVATE, 37, 127, 3);
		var otherUsers = at(stranger.getId(), NoteVisibility.PUBLIC, 38, 126, 4);
		at(stranger.getId(), NoteVisibility.PUBLIC, 39, 125, 5);
		bookmark(me.getId(), publicSaved.getId());
		bookmark(me.getId(), friendSaved.getId());
		bookmark(me.getId(), hidden.getId());
		bookmark(friend.getId(), otherUsers.getId());
		request("SAVED", "20", null).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(2))
			.andExpect(jsonPath("$.data.bounds.maxLatitude").value(36));
		jdbc.update("DELETE FROM app.friendships WHERE user_low = ? OR user_high = ?", me.getId(), me.getId());
		request("SAVED", "20", null).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(1))
			.andExpect(jsonPath("$.data.notes[0].noteId").value(publicSaved.getId().toString()));
		jdbc.update("DELETE FROM app.notes WHERE id = ?", publicSaved.getId());
		request("SAVED", "20", null).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(0))
			.andExpect(jsonPath("$.data.bounds").isEmpty())
			.andExpect(jsonPath("$.data.notes").isEmpty());
	}

	@Test
	void summaryCountsMoreThanTenThousandBeforePositionPagination() throws Exception {
		jdbc.update("""
			INSERT INTO app.notes (id, author_user_id, content, latitude, longitude, visibility, created_at)
			SELECT gen_random_uuid(), ?, '기록', 35 + (i % 20) * 0.0001,
			 129 + (i % 30) * 0.0001, 'PRIVATE', now() FROM generate_series(1, 10001) i
			""", me.getId());
		request("WRITTEN", "100", null).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(10001))
			.andExpect(jsonPath("$.data.notes.length()").value(100))
			.andExpect(jsonPath("$.data.hasNext").value(true));
	}

	@Test
	void invalidAndUnauthenticatedRequestsAreRejected() throws Exception {
		request("WRITTEN", "1", null).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.totalCount").value(0));
		for (String type : new String[] { "ALL", "WRONG" }) {
			request(type, "20", null).andExpect(status().isBadRequest());
		}
		request("WRITTEN", "0", null).andExpect(status().isBadRequest());
		request("WRITTEN", "501", null).andExpect(status().isBadRequest());
		request("WRITTEN", "20", "invalid!").andExpect(status().isBadRequest());
		mvc.perform(get("/api/v1/users/me/archive/map").header("Authorization", "Bearer " + token)
			.param("type", "WRITTEN").param("page", "1")).andExpect(status().isBadRequest());
		mvc.perform(get("/api/v1/users/me/archive/map").param("type", "WRITTEN"))
			.andExpect(status().isUnauthorized());
	}

	private Note at(UUID author, NoteVisibility visibility, double latitude, double longitude, int ageSeconds) {
		return notes.saveAndFlush(Note.createMember(UUID.randomUUID(), author, "기록", latitude, longitude,
			Instant.now().minusSeconds(ageSeconds), visibility, null, null, null));
	}

	private void bookmark(UUID userId, UUID noteId) {
		jdbc.update("INSERT INTO app.note_bookmarks (user_id, note_id, saved_at) VALUES (?, ?, now())", userId, noteId);
	}

	private ResultActions request(String type, String size, String cursor) throws Exception {
		var query = get("/api/v1/users/me/archive/map").header("Authorization", "Bearer " + token)
			.param("type", type).param("size", size);
		if (cursor != null) query.param("cursor", cursor);
		return mvc.perform(query);
	}
}
