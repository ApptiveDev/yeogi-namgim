package com.yeoginamgim.note.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.bookmark.service.BookmarkQueryService;
import com.yeoginamgim.common.rate.FixedWindowRateLimiter;
import com.yeoginamgim.note.access.NoteAccessService;
import com.yeoginamgim.note.access.NoteAccessStatus;
import com.yeoginamgim.note.access.NoteAccessTarget;
import com.yeoginamgim.note.discovery.DatabaseNoteDiscoveryService;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.domain.NoteVisibility;
import com.yeoginamgim.note.dto.NoteAuthorCategory;
import com.yeoginamgim.note.dto.NoteOpenRequest;
import com.yeoginamgim.note.dto.NoteOpenResponse;
import com.yeoginamgim.note.repository.NoteRepository;
import com.yeoginamgim.user.repository.MemberRepository;

/** Entry point for the opening/bookmark owner to extend member access and discovery policies. */
@Service
public class NoteOpenService {
	private final NoteRepository notes;
	private final NoteActorProvider actors;
	private final FixedWindowRateLimiter rateLimiter;
	private final NoteAccessService access;
	private final DatabaseNoteDiscoveryService discoveries;
	private final BookmarkQueryService bookmarks;
	private final MemberRepository members;

	public NoteOpenService(NoteRepository notes, NoteActorProvider actors, FixedWindowRateLimiter rateLimiter,
		NoteAccessService access, DatabaseNoteDiscoveryService discoveries, BookmarkQueryService bookmarks,
		MemberRepository members) {
		this.notes = notes;
		this.actors = actors;
		this.rateLimiter = rateLimiter;
		this.access = access;
		this.discoveries = discoveries;
		this.bookmarks = bookmarks;
		this.members = members;
	}

	@Transactional
	public NoteOpenResponse open(String token, UUID noteId, NoteOpenRequest request) {
		var actor = actors.identify(token);
		rateLimiter.check("member-note-open", actor.id(), 60);
		Note note = notes.findById(noteId).filter(item -> item.getAuthorUserId() != null)
			.orElseThrow(NoteNotFoundException::new);
		var target = new NoteAccessTarget(note.getId(), note.getAuthorUserId(), note.getVisibility(),
			note.getLatitude(), note.getLongitude());
		var decision = access.evaluate(actor.id(), request == null ? null : request.location(), java.util.List.of(target)).get(noteId);
		if (decision == null || decision.status() == NoteAccessStatus.HIDDEN) throw new NoteNotFoundException();
		if (decision.status() == NoteAccessStatus.LOCATION_REQUIRED) throw new NoteLocationRequiredException();
		if (decision.status() == NoteAccessStatus.LOCKED) throw new NoteLockedException();
		if (decision.status() != NoteAccessStatus.OPENABLE) throw new NoteNotFoundException();
		discoveries.recordOpen(actor.id(), noteId);
		boolean saved = bookmarks.findSavedAt(actor.id(), java.util.Set.of(noteId)).containsKey(noteId);
		return response(note, actor.id().equals(note.getAuthorUserId()), saved);
	}

	private NoteOpenResponse response(Note note, boolean isMine, boolean isSaved) {
		NoteAuthorCategory authorCategory = isMine ? NoteAuthorCategory.MINE
			: note.getVisibility() == NoteVisibility.FRIENDS ? NoteAuthorCategory.FRIEND : NoteAuthorCategory.ANONYMOUS;
		String authorNickname = authorCategory == NoteAuthorCategory.FRIEND
			? members.findById(note.getAuthorUserId()).map(member -> member.getNickname())
				.orElseThrow(NoteNotFoundException::new)
			: null;
		return new NoteOpenResponse(note.getId(), note.getContent(), isMine, note.getCreatedAt(),
			note.getVisibility(), note.getColor(), note.getPlaceName(), note.getNeighborhood(), isSaved, true,
			authorCategory, authorNickname);
	}
}
