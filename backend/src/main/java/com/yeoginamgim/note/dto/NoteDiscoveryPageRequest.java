package com.yeoginamgim.note.dto;

import java.time.Instant;

import com.yeoginamgim.note.access.LocationInput;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record NoteDiscoveryPageRequest(@Min(0) @Max(10000) Integer page,
	@Min(1) @Max(100) Integer size,
	@DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
	@DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
	@DecimalMin("0.0") @DecimalMax("1.7976931348623157E308") Double accuracyMeters, Instant measuredAt) {
	public NoteDiscoveryPageRequest {
		if (page == null) page = 0;
		if (size == null) size = 20;
	}

	@AssertTrue(message = "coordinates must be supplied together; measurement metadata requires coordinates")
	public boolean isLocationComplete() {
		return (latitude == null) == (longitude == null)
			&& (latitude != null || (accuracyMeters == null && measuredAt == null));
	}

	public LocationInput location() {
		return latitude == null ? null : new LocationInput(latitude, longitude, accuracyMeters, measuredAt);
	}
}
