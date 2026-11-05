package com.yeoginamgim.note.dto;

import com.yeoginamgim.note.domain.NoteMapFilter;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** A bounded viewport grid, independent of map-provider zoom conventions. */
public record NoteMapClusterRequest(
	@NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double minLatitude,
	@NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double minLongitude,
	@NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double maxLatitude,
	@NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double maxLongitude,
	NoteMapFilter filter,
	@Min(1) @Max(32) Integer gridSize
) {
	public NoteMapClusterRequest {
		if (filter == null) filter = NoteMapFilter.ALL;
		if (gridSize == null) gridSize = 8;
	}

	@AssertTrue(message = "minimum coordinates must not exceed maximum coordinates")
	public boolean isOrdered() {
		return minLatitude == null || minLongitude == null || maxLatitude == null || maxLongitude == null
			|| (minLatitude <= maxLatitude && minLongitude <= maxLongitude);
	}

	public NoteMapBoundsRequest bounds() {
		return new NoteMapBoundsRequest(minLatitude, minLongitude, maxLatitude, maxLongitude,
			filter, null, null, null, null, null, null);
	}
}
