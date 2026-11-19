package com.yeoginamgim.bookmark.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.yeoginamgim.note.dto.MemberMapClusterResponse.Cluster;
import com.yeoginamgim.note.dto.NoteMapBoundsRequest;
import com.yeoginamgim.note.dto.NoteMapClusterRequest;

/** Bookmark owner applies current visibility before saved map pagination or complete cluster aggregation. */
public interface BookmarkMapQueryService {
	SavedNotePage findSavedInBounds(UUID userId, NoteMapBoundsRequest query);
	List<Cluster> findSavedClusters(UUID userId, NoteMapClusterRequest query);

	record SavedNoteReference(UUID noteId, Instant savedAt) {}
	record SavedNotePage(List<SavedNoteReference> notes, boolean hasNext) {
		public SavedNotePage { notes = List.copyOf(notes); }
	}
}
