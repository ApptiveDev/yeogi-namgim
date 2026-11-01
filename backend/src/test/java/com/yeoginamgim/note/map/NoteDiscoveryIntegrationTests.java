package com.yeoginamgim.note.map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

import com.yeoginamgim.note.domain.NoteVisibility;

class NoteDiscoveryIntegrationTests extends MemberMapTestSupport {
	@Test
	void onlySuccessfulDetailOpensRecordDiscoveryAndReadNeverGrantsDistanceException() throws Exception {
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
}
