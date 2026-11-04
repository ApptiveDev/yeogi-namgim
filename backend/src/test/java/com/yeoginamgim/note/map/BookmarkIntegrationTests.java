package com.yeoginamgim.note.map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.yeoginamgim.bookmark.service.BookmarkQueryService;
import com.yeoginamgim.note.domain.NoteVisibility;

class BookmarkIntegrationTests extends MemberMapTestSupport {
	@Autowired private BookmarkQueryService bookmarkQueries;

	@Test
	void saveUsesSharedAccessAndUnlocksMapUntilRemoved() throws Exception {
		var target = note(stranger, NoteVisibility.PUBLIC, 350, "먼쪽지");
		save(target.getId(), "{}").andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error.code").value("LOCATION_REQUIRED"));
		save(target.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error.code").value("NOTE_LOCKED"));
		assertThat(bookmarkQueries.countSavedNotes(me.getId())).isZero();
		String nearby = "{\"latitude\":" + target.getLatitude() + ",\"longitude\":" + target.getLongitude() + "}";
		var first = data(save(target.getId(), nearby).andExpect(status().isCreated()));
		var repeated = data(save(target.getId(), "{}").andExpect(status().isOk()));
		assertThat(repeated.get("savedAt").asText()).isEqualTo(first.get("savedAt").asText());
		assertThat(bookmarkQueries.countSavedNotes(me.getId())).isEqualTo(1);
		map("ALL", false).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.notes[0].isSaved").value(true));
		map("SAVED", false).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.notes[0].noteId").value(target.getId().toString()));
		open(target.getId(), "{}").andExpect(status().isOk());
		mvc.perform(get("/api/v1/users/me/bookmarks").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.notes[0].noteId").value(target.getId().toString()));
		mvc.perform(delete("/api/v1/notes/{id}/bookmarks", target.getId())
			.header("Authorization", "Bearer " + token)).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.isSaved").value(false));
		open(target.getId(), "{}").andExpect(status().isForbidden());
		map("SAVED", false).andExpect(status().isOk()).andExpect(jsonPath("$.data.notes.length()").value(0));
	}

	@Test
	void ownNotesCannotBeSavedAndFormerFriendNotesDisappear() throws Exception {
		var mine = note(me, NoteVisibility.PRIVATE, 0, "내쪽지");
		save(mine.getId(), "{}").andExpect(status().isBadRequest());
		var friendOnly = note(friend, NoteVisibility.FRIENDS, 10, "친구만");
		save(friendOnly.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isCreated());
		jdbc.update("DELETE FROM app.friendships WHERE (user_low = ? AND user_high = ?) OR (user_low = ? AND user_high = ?)",
			me.getId(), friend.getId(), friend.getId(), me.getId());
		assertThat(bookmarkQueries.countSavedNotes(me.getId())).isZero();
		mvc.perform(get("/api/v1/users/me/bookmarks").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.notes.length()").value(0));
		mvc.perform(get("/api/v1/users/me/bookmarks")).andExpect(status().isUnauthorized());
	}

	private ResultActions save(UUID noteId, String body) throws Exception {
		return mvc.perform(post("/api/v1/notes/{id}/bookmarks", noteId)
			.header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body));
	}
}
