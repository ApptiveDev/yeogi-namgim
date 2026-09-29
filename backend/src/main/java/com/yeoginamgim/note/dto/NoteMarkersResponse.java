package com.yeoginamgim.note.dto;

import java.util.List;

public record NoteMarkersResponse(
	List<NoteMarkerResponse> notes
) {
}
