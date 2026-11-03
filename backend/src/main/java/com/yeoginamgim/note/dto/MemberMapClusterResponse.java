package com.yeoginamgim.note.dto;

import java.util.List;
import java.util.UUID;

public record MemberMapClusterResponse(List<Cluster> clusters, long totalCount, int gridSize) {
	public MemberMapClusterResponse { clusters = List.copyOf(clusters); }

	public record Cluster(String clusterId, double latitude, double longitude, long count, UUID noteId,
		double minLatitude, double minLongitude, double maxLatitude, double maxLongitude) {}
}
