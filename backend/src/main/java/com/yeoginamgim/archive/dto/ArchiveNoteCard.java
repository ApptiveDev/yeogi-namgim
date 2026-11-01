package com.yeoginamgim.archive.dto;

import java.time.Instant;
import java.util.UUID;

import com.yeoginamgim.note.access.NoteAccessStatus;
import com.yeoginamgim.note.domain.NoteVisibility;

public record ArchiveNoteCard(UUID noteId, String source, String preview, Instant createdAt,
	Instant savedAt, Instant firstOpenedAt, Instant lastOpenedAt, NoteVisibility visibility,
	String color, String placeName, String neighborhood, String authorCategory,
	NoteAccessStatus accessStatus, boolean isSaved, boolean isRead) {}
