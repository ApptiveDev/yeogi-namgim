package com.yeoginamgim.note.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.bookmark.service.BookmarkMapQueryService;
import com.yeoginamgim.bookmark.service.BookmarkQueryService;
import com.yeoginamgim.note.access.NoteAccessResult;
import com.yeoginamgim.note.access.NoteAccessService;
import com.yeoginamgim.note.access.NoteAccessStatus;
import com.yeoginamgim.note.discovery.NoteDiscoveryQueryService;
import com.yeoginamgim.note.domain.NoteMapFilter;
import com.yeoginamgim.note.dto.MemberMapResponse;
import com.yeoginamgim.note.dto.MemberMapResponse.Card;
import com.yeoginamgim.note.dto.MemberMapResponse.Marker;
import com.yeoginamgim.note.dto.NoteMapBoundsRequest;
import com.yeoginamgim.note.repository.MemberMapCandidate;
import com.yeoginamgim.note.repository.MemberNoteMapRepository;

@Service
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class MemberNoteMapService {
	private final MemberNoteMapRepository notes;
	private final NoteAccessService access;
	private final ObjectProvider<BookmarkQueryService> bookmarks;
	private final ObjectProvider<BookmarkMapQueryService> savedMaps;
	private final ObjectProvider<NoteDiscoveryQueryService> discoveries;

	public MemberNoteMapService(MemberNoteMapRepository notes, NoteAccessService access,
		ObjectProvider<BookmarkQueryService> bookmarks, ObjectProvider<BookmarkMapQueryService> savedMaps,
		ObjectProvider<NoteDiscoveryQueryService> discoveries) {
		this.notes = notes;
		this.access = access;
		this.bookmarks = bookmarks;
		this.savedMaps = savedMaps;
		this.discoveries = discoveries;
	}

	@Transactional(readOnly = true)
	public MemberMapResponse find(UUID userId, NoteMapBoundsRequest query) {
		List<MemberMapCandidate> candidates;
		boolean hasNext;
		BookmarkQueryService bookmarkSource = bookmarks.getIfAvailable();
		if (query.filter() == NoteMapFilter.SAVED) {
			BookmarkMapQueryService savedSource = savedMaps.getIfAvailable();
			if (bookmarkSource == null || savedSource == null) throw new MapDataUnavailableException();
			var page = savedSource.findSavedInBounds(userId, query);
			if (page.notes().size() > query.size()) throw new MapDataUnavailableException();
			Map<UUID, Instant> savedOrder = page.notes().stream().collect(Collectors.toMap(
				BookmarkMapQueryService.SavedNoteReference::noteId, BookmarkMapQueryService.SavedNoteReference::savedAt));
			candidates = notes.findVisibleByIds(userId, query, savedOrder.keySet()).stream()
				.sorted(Comparator.<MemberMapCandidate, Instant>comparing(note -> savedOrder.get(note.noteId())).reversed()
					.thenComparing(note -> note.noteId().toString(), Comparator.reverseOrder())).toList();
			if (candidates.size() != savedOrder.size()) throw new MapDataUnavailableException();
			hasNext = page.hasNext();
		} else {
			List<MemberMapCandidate> found = notes.find(userId, query);
			hasNext = found.size() > query.size();
			candidates = found.stream().limit(query.size()).toList();
		}
		Set<UUID> ids = candidates.stream().map(MemberMapCandidate::noteId).collect(Collectors.toSet());
		Map<UUID, Instant> saved = bookmarkSource == null || ids.isEmpty() ? Map.of() : bookmarkSource.findSavedAt(userId, ids);
		if (query.filter() == NoteMapFilter.SAVED && ids.stream().anyMatch(id -> saved.get(id) == null)) throw new MapDataUnavailableException();
		NoteDiscoveryQueryService discoverySource = discoveries.getIfAvailable();
		Set<UUID> read = discoverySource == null || ids.isEmpty() ? Set.of() : discoverySource.findReadNoteIds(userId, ids);
		Map<UUID, NoteAccessResult> decisions = access.evaluate(userId, query.location(),
			candidates.stream().map(MemberMapCandidate::accessTarget).toList());
		List<Marker> markers = new ArrayList<>();
		List<Card> cards = new ArrayList<>();
		for (MemberMapCandidate note : candidates) {
			NoteAccessResult decision = decisions.get(note.noteId());
			if (decision == null || decision.status() == null || decision.status() == NoteAccessStatus.HIDDEN) continue;
			boolean mine = userId.equals(note.authorUserId());
			Boolean isSaved = bookmarkSource == null ? null : saved.get(note.noteId()) != null;
			Boolean isRead = discoverySource == null ? null : read.contains(note.noteId());
			markers.add(new Marker(note.noteId(), note.latitude(), note.longitude(), mine, note.color(), note.visibility(),
				decision.status(), decision.distanceMeters(), isSaved, isRead));
			if (decision.status() == NoteAccessStatus.OPENABLE) {
				cards.add(new Card(note.noteId(), preview(note.content()), decision.distanceMeters(), mine,
					note.color(), note.visibility(), note.placeName(), note.neighborhood(), note.createdAt(),
					saved.get(note.noteId()), isSaved, isRead, query.filter() == NoteMapFilter.FRIENDS ? note.nickname() : null));
			}
		}
		return new MemberMapResponse(markers, cards, query.page(), query.size(), hasNext);
	}

	private String preview(String content) {
		int count = content.codePointCount(0, content.length());
		return count <= 100 ? content : content.substring(0, content.offsetByCodePoints(0, 100));
	}
}
