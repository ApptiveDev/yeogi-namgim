package com.yeoginamgim.note.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import java.time.Instant;
import com.yeoginamgim.note.domain.NoteMapFilter;
import com.yeoginamgim.note.access.LocationInput;

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
	Double maxLongitude,
	NoteMapFilter filter,
	@Min(0) @Max(10000) Integer page,
	@Min(1) @Max(500) Integer size,
	@DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
	@DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
	@DecimalMin("0.0") @DecimalMax("1.7976931348623157E308") Double accuracyMeters,
	Instant measuredAt
) {
	public NoteMapBoundsRequest {
		if (filter == null) filter = NoteMapFilter.ALL;
		if (page == null) page = 0;
		if (size == null) size = 100;
	}

	public NoteMapBoundsRequest(Double minLatitude, Double minLongitude, Double maxLatitude, Double maxLongitude) {
		this(minLatitude, minLongitude, maxLatitude, maxLongitude, null, null, null, null, null, null, null);
	}

	@AssertTrue(message = "coordinates must be supplied together; measurement metadata requires coordinates")
	public boolean isLocationComplete() {
		return (latitude == null) == (longitude == null)
			&& (latitude != null || (accuracyMeters == null && measuredAt == null));
	}

	public LocationInput location() {
		return latitude == null ? null : new LocationInput(latitude, longitude, accuracyMeters, measuredAt);
	}

	@AssertTrue(message = "minimum coordinates must not exceed maximum coordinates")
	public boolean isOrdered() {
		return minLatitude == null
			|| minLongitude == null
			|| maxLatitude == null
			|| maxLongitude == null
			|| (minLatitude <= maxLatitude && minLongitude <= maxLongitude);
	}
}
