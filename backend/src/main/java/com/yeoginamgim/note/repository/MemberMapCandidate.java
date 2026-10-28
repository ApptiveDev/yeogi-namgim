package com.yeoginamgim.note.repository;

import java.time.Instant;
import java.util.UUID;

import com.yeoginamgim.note.access.NoteAccessTarget;
import com.yeoginamgim.note.domain.NoteVisibility;

/** Internal query result. Content and author identifiers never go directly to marker responses. */
public record MemberMapCandidate(UUID noteId, UUID authorUserId, NoteVisibility visibility, String content,
	double latitude, double longitude, Instant createdAt, String color, String placeName,
	String neighborhood, String nickname, Double distanceMeters) {
	public NoteAccessTarget accessTarget() {
		return new NoteAccessTarget(noteId, authorUserId, visibility, latitude, longitude);
	}
}
