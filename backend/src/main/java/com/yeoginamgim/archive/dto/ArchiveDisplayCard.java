package com.yeoginamgim.archive.dto;

import java.time.Instant;
import java.util.UUID;

import com.yeoginamgim.note.access.NoteAccessStatus;
import com.yeoginamgim.note.domain.NoteVisibility;

/** Archive-only card: other note lists keep their existing author privacy contract. */
public record ArchiveDisplayCard(UUID noteId, String source, String preview, Instant createdAt,
	Instant savedAt, Instant firstOpenedAt, Instant lastOpenedAt, NoteVisibility visibility,
	String color, String placeName, String neighborhood, String authorCategory,
	String authorDisplayName, NoteAccessStatus accessStatus, boolean isSaved, Boolean isRead) {
	public static ArchiveDisplayCard from(ArchiveNoteCard card, String authorDisplayName) {
		return new ArchiveDisplayCard(card.noteId(), card.source(), card.preview(), card.createdAt(),
			card.savedAt(), card.firstOpenedAt(), card.lastOpenedAt(), card.visibility(), card.color(),
			card.placeName(), card.neighborhood(), card.authorCategory(), authorDisplayName,
			card.accessStatus(), card.isSaved(), card.isRead());
	}
}
