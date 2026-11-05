package com.yeoginamgim.note.map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.yeoginamgim.note.domain.NoteVisibility;

class FriendRemovalIntegrationTests extends MemberMapTestSupport {
	@Test
	void removalImmediatelyRevokesFriendOnlyMapActivityAndDetail() throws Exception {
		var friendNote = note(friend, NoteVisibility.FRIENDS, 10, "친구 쪽지");
		map("FRIENDS", true).andExpect(status().isOk()).andExpect(jsonPath("$.data.notes.length()").value(1));
		mvc.perform(get("/api/v1/friends/activities").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.activities.length()").value(1));
		mvc.perform(delete("/api/v1/friends/{id}", friend.getId()).header("Authorization", "Bearer " + token))
			.andExpect(status().isOk());
		map("FRIENDS", true).andExpect(status().isOk()).andExpect(jsonPath("$.data.notes.length()").value(0));
		mvc.perform(get("/api/v1/friends/activities").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.activities.length()").value(0));
		open(friendNote.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isNotFound());
	}
}
