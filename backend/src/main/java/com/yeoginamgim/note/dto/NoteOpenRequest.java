package com.yeoginamgim.note.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.AssertTrue;

public record NoteOpenRequest(
	@DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
	@DecimalMin("-180.0") @DecimalMax("180.0") Double longitude
) {
	@AssertTrue(message = "latitude and longitude must be supplied together")
	public boolean isLocationComplete() {
		return (latitude == null) == (longitude == null);
	}
}
