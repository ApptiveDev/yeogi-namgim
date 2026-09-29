package com.yeoginamgim.note.dto;

import java.util.UUID;

public record NoteMarkerResponse(
	UUID noteId,
	double latitude,
	double longitude,
	boolean isMine
) {
}
