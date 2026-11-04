package com.yeoginamgim.bookmark.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.archive.service.NoteCardAssembler;
import com.yeoginamgim.archive.service.NoteCardAssembler.Reference;
import com.yeoginamgim.bookmark.dto.BookmarkStateResponse;
import com.yeoginamgim.bookmark.dto.BookmarkedNotesResponse;
import com.yeoginamgim.bookmark.repository.BookmarkRepository;
import com.yeoginamgim.note.access.LocationInput;
import com.yeoginamgim.note.access.NoteAccessService;
import com.yeoginamgim.note.access.NoteAccessStatus;
import com.yeoginamgim.note.access.NoteAccessTarget;
import com.yeoginamgim.note.dto.NoteMapBoundsRequest;
import com.yeoginamgim.note.dto.NotePageRequest;
import com.yeoginamgim.note.repository.NoteRepository;
import com.yeoginamgim.note.service.InvalidNoteRequestException;
import com.yeoginamgim.note.service.NoteLocationRequiredException;
import com.yeoginamgim.note.service.NoteLockedException;
import com.yeoginamgim.note.service.NoteNotFoundException;

@Service
public class DatabaseBookmarkService implements BookmarkQueryService, BookmarkMapQueryService {
	private final BookmarkRepository bookmarks;
	private final NoteRepository notes;
	private final NoteAccessService access;
	private final NoteCardAssembler cards;

	public DatabaseBookmarkService(BookmarkRepository bookmarks, NoteRepository notes,
		NoteAccessService access, NoteCardAssembler cards) {
		this.bookmarks = bookmarks;
		this.notes = notes;
		this.access = access;
		this.cards = cards;
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, Instant> findSavedAt(UUID userId, Set<UUID> noteIds) {
		return bookmarks.findSavedAt(userId, noteIds);
	}

	@Override
	@Transactional(readOnly = true)
	public long countSavedNotes(UUID userId) { return bookmarks.countVisible(userId); }

	@Override
	@Transactional(readOnly = true)
	public SavedNotePage findSavedInBounds(UUID userId, NoteMapBoundsRequest query) {
		var found = bookmarks.findVisibleInBounds(userId, query);
		return new SavedNotePage(found.stream().limit(query.size()).toList(), found.size() > query.size());
	}

	@Transactional
	public SaveOutcome save(UUID userId, UUID noteId, LocationInput location) {
		var note = notes.findById(noteId).filter(item -> item.getAuthorUserId() != null)
			.orElseThrow(NoteNotFoundException::new);
		if (userId.equals(note.getAuthorUserId())) {
			throw new InvalidNoteRequestException("내가 쓴 쪽지는 보관함에 자동 포함되므로 저장할 수 없습니다.");
		}
		var decision = access.evaluate(userId, location, List.of(new NoteAccessTarget(note.getId(),
			note.getAuthorUserId(), note.getVisibility(), note.getLatitude(), note.getLongitude()))).get(noteId);
		if (decision == null || decision.status() == NoteAccessStatus.HIDDEN) throw new NoteNotFoundException();
		if (decision.status() == NoteAccessStatus.LOCATION_REQUIRED) throw new NoteLocationRequiredException();
		if (decision.status() == NoteAccessStatus.LOCKED) throw new NoteLockedException();
		if (decision.status() != NoteAccessStatus.OPENABLE) throw new NoteNotFoundException();
		var result = bookmarks.insert(userId, noteId, Instant.now());
		return new SaveOutcome(new BookmarkStateResponse(noteId, true, result.savedAt()), result.created());
	}

	@Transactional
	public BookmarkStateResponse remove(UUID userId, UUID noteId) {
		bookmarks.delete(userId, noteId);
		return new BookmarkStateResponse(noteId, false, null);
	}

	@Transactional(readOnly = true)
	public BookmarkedNotesResponse findMine(UUID userId, NotePageRequest request) {
		var found = bookmarks.findVisiblePage(userId, request.page(), request.size());
		var refs = found.stream().limit(request.size())
			.map(item -> new Reference(item.noteId(), "SAVED", item.savedAt(), null, null)).toList();
		return new BookmarkedNotesResponse(cards.assemble(userId, refs, null), request.page(), request.size(),
			found.size() > request.size());
	}

	public record SaveOutcome(BookmarkStateResponse state, boolean created) {}
}
