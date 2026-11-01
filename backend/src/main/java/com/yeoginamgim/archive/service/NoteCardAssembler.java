package com.yeoginamgim.archive.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.yeoginamgim.archive.dto.ArchiveNoteCard;
import com.yeoginamgim.bookmark.repository.BookmarkRepository;
import com.yeoginamgim.friend.service.FriendshipQueryService;
import com.yeoginamgim.note.access.LocationInput;
import com.yeoginamgim.note.access.NoteAccessService;
import com.yeoginamgim.note.access.NoteAccessStatus;
import com.yeoginamgim.note.access.NoteAccessTarget;
import com.yeoginamgim.note.discovery.NoteDiscoveryRepository;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.repository.NoteRepository;

@Component
public class NoteCardAssembler {
	private final NoteRepository notes;
	private final NoteAccessService access;
	private final BookmarkRepository bookmarks;
	private final NoteDiscoveryRepository discoveries;
	private final FriendshipQueryService friends;

	public NoteCardAssembler(NoteRepository notes, NoteAccessService access, BookmarkRepository bookmarks,
		NoteDiscoveryRepository discoveries, FriendshipQueryService friends) {
		this.notes = notes;
		this.access = access;
		this.bookmarks = bookmarks;
		this.discoveries = discoveries;
		this.friends = friends;
	}

	public List<ArchiveNoteCard> assemble(UUID userId, List<Reference> references, LocationInput location) {
		if (references.isEmpty()) return List.of();
		Set<UUID> ids = references.stream().map(Reference::noteId).collect(Collectors.toSet());
		Map<UUID, Note> byId = new HashMap<>();
		notes.findAllById(ids).forEach(note -> byId.put(note.getId(), note));
		List<NoteAccessTarget> targets = byId.values().stream().filter(note -> note.getAuthorUserId() != null)
			.map(note -> new NoteAccessTarget(note.getId(), note.getAuthorUserId(), note.getVisibility(),
				note.getLatitude(), note.getLongitude())).toList();
		var decisions = access.evaluate(userId, location, targets);
		var saved = bookmarks.findSavedAt(userId, ids);
		var read = discoveries.findReadNoteIds(userId, ids);
		Set<UUID> friendIds = friends.findFriendIds(userId, byId.values().stream()
			.map(Note::getAuthorUserId).filter(id -> id != null && !id.equals(userId)).collect(Collectors.toSet()));
		List<ArchiveNoteCard> cards = new ArrayList<>();
		for (Reference reference : references) {
			Note note = byId.get(reference.noteId());
			if (note == null || note.getAuthorUserId() == null) continue;
			var decision = decisions.get(note.getId());
			if (decision == null || decision.status() == null || decision.status() == NoteAccessStatus.HIDDEN) continue;
			boolean openable = decision.status() == NoteAccessStatus.OPENABLE;
			String category = userId.equals(note.getAuthorUserId()) ? "MINE"
				: friendIds.contains(note.getAuthorUserId()) ? "FRIEND" : "ANONYMOUS";
			cards.add(new ArchiveNoteCard(note.getId(), reference.source(), openable ? preview(note.getContent()) : null,
				note.getCreatedAt(), reference.savedAt(), reference.firstOpenedAt(), reference.lastOpenedAt(),
				note.getVisibility(), note.getColor(), openable ? note.getPlaceName() : null,
				openable ? note.getNeighborhood() : null, category, decision.status(),
				saved.containsKey(note.getId()), read.contains(note.getId())));
		}
		return cards;
	}

	private String preview(String content) {
		int count = content.codePointCount(0, content.length());
		return count <= 100 ? content : content.substring(0, content.offsetByCodePoints(0, 100));
	}

	public record Reference(UUID noteId, String source, Instant savedAt,
		Instant firstOpenedAt, Instant lastOpenedAt) {}
}
