package com.yeoginamgim.note.dto;

import java.time.Instant;
import java.util.UUID;

public record NoteOpenResponse(UUID noteId, String content, boolean isMine, Instant createdAt) {
}
