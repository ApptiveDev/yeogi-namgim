package com.yeoginamgim.note.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record NotePageRequest(@Min(0) @Max(10000) Integer page, @Min(1) @Max(100) Integer size) {
	public NotePageRequest {
		if (page == null) page = 0;
		if (size == null) size = 20;
	}
}
