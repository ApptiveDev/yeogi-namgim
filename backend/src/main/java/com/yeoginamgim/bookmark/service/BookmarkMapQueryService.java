package com.yeoginamgim.bookmark.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.yeoginamgim.note.dto.NoteMapBoundsRequest;

/** Bookmark owner applies bounds/visibility and savedAt DESC, noteId DESC before pagination. */
public interface BookmarkMapQueryService {
	SavedNotePage findSavedInBounds(UUID userId, NoteMapBoundsRequest query);

	record SavedNoteReference(UUID noteId, Instant savedAt) {}
	record SavedNotePage(List<SavedNoteReference> notes, boolean hasNext) {
		public SavedNotePage { notes = List.copyOf(notes); }
	}
}
