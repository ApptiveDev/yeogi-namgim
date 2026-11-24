package com.yeoginamgim.archive.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.archive.dto.ArchiveMapRequest;
import com.yeoginamgim.archive.dto.ArchiveMapResponse;
import com.yeoginamgim.archive.repository.ArchiveMapRepository;

@Service
public class ArchiveMapService {
	private final ArchiveMapRepository maps;

	public ArchiveMapService(ArchiveMapRepository maps) { this.maps = maps; }

	@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
	public ArchiveMapResponse find(UUID userId, ArchiveMapRequest request) {
		var cursor = ArchiveMapCursor.decode(request.cursor(), userId, request.type());
		var summary = maps.summarize(userId, request.type());
		var found = maps.page(userId, request, cursor);
		var page = found.stream().limit(request.size()).toList();
		boolean hasNext = found.size() > request.size();
		String nextCursor = hasNext ? ArchiveMapCursor.encode(userId, request.type(),
			page.getLast().createdAt(), page.getLast().noteId()) : null;
		return new ArchiveMapResponse(summary.totalCount(), summary.bounds(),
			page.stream().map(ArchiveMapRepository.Entry::position).toList(), request.size(), hasNext, nextCursor);
	}
}
