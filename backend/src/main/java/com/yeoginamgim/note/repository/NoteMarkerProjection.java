package com.yeoginamgim.note.repository;

import java.util.UUID;

public interface NoteMarkerProjection {
	UUID getNoteId();

	double getLatitude();

	double getLongitude();

	UUID getGuestAuthorId();
}
