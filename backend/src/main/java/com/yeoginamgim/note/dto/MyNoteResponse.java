package com.yeoginamgim.note.dto;

import java.time.Instant;
import java.util.UUID;

import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.domain.NoteVisibility;

public record MyNoteResponse(UUID noteId, String content, double latitude, double longitude,
	NoteVisibility visibility, String color, String placeName, String neighborhood,
	Instant createdAt, boolean isMine) {
	public static MyNoteResponse from(Note note) {
		return new MyNoteResponse(note.getId(), note.getContent(), note.getLatitude(), note.getLongitude(),
			note.getVisibility(), note.getColor(), note.getPlaceName(), note.getNeighborhood(), note.getCreatedAt(), true);
	}
}
