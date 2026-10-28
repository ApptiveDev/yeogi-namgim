package com.yeoginamgim.note.access;

import java.util.UUID;
import com.yeoginamgim.note.domain.NoteVisibility;

public record NoteAccessTarget(UUID noteId, UUID authorUserId, NoteVisibility visibility,
	double latitude, double longitude) {}
