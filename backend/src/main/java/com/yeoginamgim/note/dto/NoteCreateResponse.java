package com.yeoginamgim.note.dto;

import java.time.Instant;
import java.util.UUID;

public record NoteCreateResponse(
	UUID noteId,
	Instant createdAt
) {
}
