package com.yeoginamgim.archive.dto;

import java.util.List;
import java.util.UUID;

public record ArchiveMapResponse(long totalCount, Bounds bounds, List<Position> notes,
	int size, boolean hasNext, String nextCursor) {
	public ArchiveMapResponse { notes = List.copyOf(notes); }

	public record Bounds(double minLatitude, double minLongitude, double maxLatitude, double maxLongitude) {}
	public record Position(UUID noteId, double latitude, double longitude) {}
}
