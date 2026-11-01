package com.yeoginamgim.note.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.AssertTrue;
import java.time.Instant;
import com.yeoginamgim.note.access.LocationInput;

public record NoteOpenRequest(
	@DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
	@DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
	@DecimalMin("0.0") @DecimalMax("1.7976931348623157E308") Double accuracyMeters,
	Instant measuredAt
) {
	public NoteOpenRequest(Double latitude, Double longitude) {
		this(latitude, longitude, null, null);
	}

	@AssertTrue(message = "latitude and longitude must be supplied together")
	public boolean isLocationComplete() {
		return (latitude == null) == (longitude == null)
			&& (latitude != null || (accuracyMeters == null && measuredAt == null));
	}

	public LocationInput location() {
		return latitude == null ? null : new LocationInput(latitude, longitude, accuracyMeters, measuredAt);
	}
}
