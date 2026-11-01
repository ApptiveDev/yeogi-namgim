package com.yeoginamgim.note.discovery;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.archive.service.NoteCardAssembler;
import com.yeoginamgim.archive.service.NoteCardAssembler.Reference;
import com.yeoginamgim.note.dto.DiscoveredNotesResponse;
import com.yeoginamgim.note.dto.NoteDiscoveryPageRequest;

@Service
public class DatabaseNoteDiscoveryService implements NoteDiscoveryQueryService {
	private final NoteDiscoveryRepository discoveries;
	private final NoteCardAssembler cards;

	public DatabaseNoteDiscoveryService(NoteDiscoveryRepository discoveries, NoteCardAssembler cards) {
		this.discoveries = discoveries;
		this.cards = cards;
	}

	@Transactional
	public void recordOpen(UUID userId, UUID noteId) {
		discoveries.recordOpen(userId, noteId, Instant.now());
	}

	@Override
	@Transactional(readOnly = true)
	public Set<UUID> findReadNoteIds(UUID userId, Set<UUID> noteIds) {
		return discoveries.findReadNoteIds(userId, noteIds);
	}

	@Transactional(readOnly = true)
	public DiscoveredNotesResponse findMine(UUID userId, NoteDiscoveryPageRequest request) {
		var found = discoveries.findVisiblePage(userId, request.page(), request.size());
		var refs = found.stream().limit(request.size())
			.map(item -> new Reference(item.noteId(), "DISCOVERED", null,
				item.firstOpenedAt(), item.lastOpenedAt())).toList();
		return new DiscoveredNotesResponse(cards.assemble(userId, refs, request.location()),
			request.page(), request.size(), found.size() > request.size());
	}
}
