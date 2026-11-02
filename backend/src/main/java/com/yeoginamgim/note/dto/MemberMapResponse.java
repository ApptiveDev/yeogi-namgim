package com.yeoginamgim.note.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.yeoginamgim.note.access.NoteAccessStatus;
import com.yeoginamgim.note.domain.NoteVisibility;

public record MemberMapResponse(List<Marker> notes, List<Card> openableNotes, int page, int size, boolean hasNext) {
	public record Marker(UUID noteId, double latitude, double longitude, boolean isMine,
		String color, NoteVisibility visibility, NoteAccessStatus accessStatus, Double distanceMeters,
		Boolean isSaved, Boolean isRead) {}
	public record Card(UUID noteId, String preview, Double distanceMeters, boolean isMine,
		String color, NoteVisibility visibility, String placeName, String neighborhood,
		Instant createdAt, Instant savedAt, Boolean isSaved, Boolean isRead, String authorNickname) {}
}
