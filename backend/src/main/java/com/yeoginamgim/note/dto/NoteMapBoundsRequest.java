package com.yeoginamgim.note.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record NoteMapBoundsRequest(
	@NotNull
	@DecimalMin("-90.0")
	@DecimalMax("90.0")
	Double minLatitude,

	@NotNull
	@DecimalMin("-180.0")
	@DecimalMax("180.0")
	Double minLongitude,

	@NotNull
	@DecimalMin("-90.0")
	@DecimalMax("90.0")
	Double maxLatitude,

	@NotNull
	@DecimalMin("-180.0")
	@DecimalMax("180.0")
	Double maxLongitude
) {
	@AssertTrue(message = "minimum coordinates must not exceed maximum coordinates")
	public boolean isOrdered() {
		return minLatitude == null
			|| minLongitude == null
			|| maxLatitude == null
			|| maxLongitude == null
			|| (minLatitude <= maxLatitude && minLongitude <= maxLongitude);
	}
}
