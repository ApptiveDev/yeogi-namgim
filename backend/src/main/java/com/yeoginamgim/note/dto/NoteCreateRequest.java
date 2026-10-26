package com.yeoginamgim.note.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import com.yeoginamgim.note.domain.NoteVisibility;

public record NoteCreateRequest(
	@NotBlank
	@Size(max = 500)
	String content,

	@NotNull
	@DecimalMin("-90.0")
	@DecimalMax("90.0")
	Double latitude,

	@NotNull
	@DecimalMin("-180.0")
	@DecimalMax("180.0")
	Double longitude,

	NoteVisibility visibility,
	@Pattern(regexp = "(?:#[0-9A-Fa-f]{6}|[A-Za-z][A-Za-z0-9_-]{0,31})")
	String color,
	@Size(max = 200) String placeName,
	@Size(max = 100) String neighborhood
) {
	public NoteCreateRequest(String content, Double latitude, Double longitude) {
		this(content, latitude, longitude, null, null, null, null);
	}
}
