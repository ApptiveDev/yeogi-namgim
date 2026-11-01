package com.yeoginamgim.note.access;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.bookmark.service.BookmarkQueryService;
import com.yeoginamgim.friend.service.FriendshipQueryService;
import com.yeoginamgim.note.domain.NoteVisibility;
import com.yeoginamgim.note.repository.MemberNoteMapRepository;

@Service
public class GeographicNoteAccessService implements NoteAccessService {
	private final FriendshipQueryService friends;
	private final ObjectProvider<BookmarkQueryService> bookmarks;
	private final MemberNoteMapRepository notes;

	public GeographicNoteAccessService(FriendshipQueryService friends, ObjectProvider<BookmarkQueryService> bookmarks,
		MemberNoteMapRepository notes) {
		this.friends = friends;
		this.bookmarks = bookmarks;
		this.notes = notes;
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, NoteAccessResult> evaluate(UUID userId, LocationInput location, List<NoteAccessTarget> targets) {
		if (targets.isEmpty()) return Map.of();
		Set<UUID> authorIds = targets.stream().map(NoteAccessTarget::authorUserId).collect(Collectors.toSet());
		Set<UUID> friendIds = friends.findFriendIds(userId, authorIds);
		List<NoteAccessTarget> visible = targets.stream().filter(target -> userId.equals(target.authorUserId())
			|| target.visibility() == NoteVisibility.PUBLIC
			|| (target.visibility() == NoteVisibility.FRIENDS && friendIds.contains(target.authorUserId()))).toList();
		Set<UUID> ids = visible.stream().map(NoteAccessTarget::noteId).collect(Collectors.toSet());
		Set<UUID> savedCandidates = visible.stream().filter(target -> !userId.equals(target.authorUserId()))
			.map(NoteAccessTarget::noteId).collect(Collectors.toSet());
		BookmarkQueryService bookmarkSource = bookmarks.getIfAvailable();
		Map<UUID, java.time.Instant> saved = bookmarkSource == null || savedCandidates.isEmpty() ? Map.of()
			: bookmarkSource.findSavedAt(userId, savedCandidates);
		Map<UUID, Double> distances = notes.findDistances(location, ids);
		Map<UUID, NoteAccessResult> result = new HashMap<>();
		for (NoteAccessTarget target : targets) result.put(target.noteId(), new NoteAccessResult(NoteAccessStatus.HIDDEN, null));
		for (NoteAccessTarget target : visible) {
			Double distance = distances.get(target.noteId());
			NoteAccessStatus status;
			if (userId.equals(target.authorUserId()) || saved.get(target.noteId()) != null) status = NoteAccessStatus.OPENABLE;
			else if (location == null) status = NoteAccessStatus.LOCATION_REQUIRED;
			else if (distance == null) status = NoteAccessStatus.HIDDEN;
			else status = distance <= 200.0 ? NoteAccessStatus.OPENABLE : NoteAccessStatus.LOCKED;
			result.put(target.noteId(), new NoteAccessResult(status, status == NoteAccessStatus.HIDDEN ? null : distance));
		}
		return result;
	}
}
