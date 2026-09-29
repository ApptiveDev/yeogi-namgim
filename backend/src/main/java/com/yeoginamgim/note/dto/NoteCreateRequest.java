package com.yeoginamgim.note.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

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
	Double longitude
) {
}
