package com.yeoginamgim.note.map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.yeoginamgim.bookmark.service.BookmarkMapQueryService;
import com.yeoginamgim.bookmark.service.BookmarkMapQueryService.SavedNotePage;
import com.yeoginamgim.bookmark.service.BookmarkMapQueryService.SavedNoteReference;
import com.yeoginamgim.bookmark.service.BookmarkQueryService;
import com.yeoginamgim.note.discovery.NoteDiscoveryQueryService;
import com.yeoginamgim.note.domain.NoteVisibility;

/** State owners are mocked here only; production has no allow-all/empty bookmark implementation. */
class MemberMapStateIntegrationTests extends MemberMapTestSupport {
	@MockitoBean private BookmarkQueryService bookmarks;
	@MockitoBean private BookmarkMapQueryService savedMaps;
	@MockitoBean private NoteDiscoveryQueryService discoveries;

	@Test
	void realBookmarkSourceEnablesDistanceExceptionWithoutLocation() throws Exception {
		var target = note(stranger, NoteVisibility.PUBLIC, 350, "저장된쪽지");
		Instant savedAt = Instant.parse("2026-10-27T01:00:00Z");
		when(bookmarks.findSavedAt(eq(me.getId()), any())).thenReturn(Map.of(target.getId(), savedAt));
		when(discoveries.findReadNoteIds(eq(me.getId()), any())).thenReturn(Set.of(target.getId()));
		map("ALL", false).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.notes[0].isSaved").value(true))
			.andExpect(jsonPath("$.data.notes[0].isRead").value(true))
			.andExpect(jsonPath("$.data.openableNotes[0].noteId").value(target.getId().toString()));
		open(target.getId(), "{}").andExpect(status().isOk());
	}

	@Test
	void readWithoutBookmarkNeverBypassesDistanceAndMovingRelocks() throws Exception {
		var target = note(stranger, NoteVisibility.PUBLIC, 100, "읽은쪽지");
		when(bookmarks.findSavedAt(eq(me.getId()), any())).thenReturn(Map.of());
		when(discoveries.findReadNoteIds(eq(me.getId()), any())).thenReturn(Set.of(target.getId()));
		map("ALL", true).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.openableNotes[0].isRead").value(true));
		open(target.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isOk());
		open(target.getId(), "{\"latitude\":36,\"longitude\":129}").andExpect(status().isForbidden())
			.andExpect(jsonPath("$.error.code").value("NOTE_LOCKED"));
		map("ALL", false).andExpect(status().isOk()).andExpect(jsonPath("$.data.openableNotes.length()").value(0));
	}

	@Test
	void savedFilterUsesPersistedSaveOrderAndBoundedPageSource() throws Exception {
		var oldNear = note(stranger, NoteVisibility.PUBLIC, 10, "이전에저장");
		var newFar = note(stranger, NoteVisibility.PUBLIC, 350, "나중에저장");
		Instant oldSave = Instant.parse("2026-10-26T00:00:00Z");
		Instant newSave = Instant.parse("2026-10-27T00:00:00Z");
		when(savedMaps.findSavedInBounds(eq(me.getId()), any())).thenReturn(new SavedNotePage(List.of(
			new SavedNoteReference(oldNear.getId(), oldSave), new SavedNoteReference(newFar.getId(), newSave)), true));
		when(bookmarks.findSavedAt(eq(me.getId()), any())).thenReturn(Map.of(oldNear.getId(), oldSave, newFar.getId(), newSave));
		var data = data(map("SAVED", true).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.hasNext").value(true)));
		assertThat(ids(data.get("notes"))).containsExactly(newFar.getId().toString(), oldNear.getId().toString());
		assertThat(ids(data.get("openableNotes"))).containsExactly(newFar.getId().toString(), oldNear.getId().toString());
	}

	@Test
	void evenSavedSourceCannotExposeSomeoneElsesPrivateOrUnrelatedFriendNote() throws Exception {
		var privateNote = note(stranger, NoteVisibility.PRIVATE, 10, "저장소스잘못돌려줘도숨김");
		var unrelated = note(stranger, NoteVisibility.FRIENDS, 10, "비친구노출안함");
		Instant now = Instant.now();
		when(savedMaps.findSavedInBounds(eq(me.getId()), any())).thenReturn(new SavedNotePage(List.of(
			new SavedNoteReference(privateNote.getId(), now), new SavedNoteReference(unrelated.getId(), now)), false));
		when(bookmarks.findSavedAt(eq(me.getId()), any())).thenReturn(Map.of(privateNote.getId(), now, unrelated.getId(), now));
		map("SAVED", true).andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.error.code").value("MAP_DATA_UNAVAILABLE"));
		open(privateNote.getId(), "{}").andExpect(status().isNotFound());
		open(unrelated.getId(), "{}").andExpect(status().isNotFound());
	}

	@Test
	void inconsistentSavedProvidersAreReportedAsUnavailable() throws Exception {
		var target = note(stranger, NoteVisibility.PUBLIC, 10, "소스불일치");
		when(savedMaps.findSavedInBounds(eq(me.getId()), any())).thenReturn(new SavedNotePage(List.of(
			new SavedNoteReference(target.getId(), Instant.now())), false));
		when(bookmarks.findSavedAt(eq(me.getId()), any())).thenReturn(Map.of());
		map("SAVED", true).andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.error.code").value("MAP_DATA_UNAVAILABLE"));
	}

	@Test
	void savedSourceMustHonorRequestedPageSize() throws Exception {
		var first = note(stranger, NoteVisibility.PUBLIC, 20, "하나");
		var second = note(stranger, NoteVisibility.PUBLIC, 30, "둘");
		when(savedMaps.findSavedInBounds(eq(me.getId()), any())).thenReturn(new SavedNotePage(List.of(
			new SavedNoteReference(first.getId(), Instant.now()), new SavedNoteReference(second.getId(), Instant.now())), false));
		map("SAVED", true, Map.of("size", "1")).andExpect(status().isServiceUnavailable());
	}
}
