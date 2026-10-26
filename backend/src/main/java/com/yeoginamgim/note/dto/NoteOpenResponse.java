package com.yeoginamgim.note.dto;

import java.time.Instant;
import java.util.UUID;
import com.yeoginamgim.note.domain.NoteVisibility;

public record NoteOpenResponse(UUID noteId, String content, boolean isMine, Instant createdAt,
	NoteVisibility visibility, String color, String placeName, String neighborhood) {
	public NoteOpenResponse(UUID noteId, String content, boolean isMine, Instant createdAt) {
		this(noteId, content, isMine, createdAt, NoteVisibility.PUBLIC, null, null, null);
	}
}
