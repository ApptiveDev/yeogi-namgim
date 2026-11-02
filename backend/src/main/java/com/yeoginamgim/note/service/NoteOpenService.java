package com.yeoginamgim.note.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.common.rate.FixedWindowRateLimiter;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.dto.NoteOpenRequest;
import com.yeoginamgim.note.dto.NoteOpenResponse;
import com.yeoginamgim.note.repository.NoteRepository;
import com.yeoginamgim.note.access.NoteAccessService;
import com.yeoginamgim.note.access.NoteAccessTarget;
import com.yeoginamgim.note.access.NoteAccessStatus;

/** Entry point for the opening/bookmark owner to extend member access and discovery policies. */
@Service
public class NoteOpenService {
	private final NoteRepository notes;
	private final NoteActorProvider actors;
	private final FixedWindowRateLimiter rateLimiter;
	private final NoteAccessService access;

	public NoteOpenService(NoteRepository notes, NoteActorProvider actors, FixedWindowRateLimiter rateLimiter,
		NoteAccessService access) {
		this.notes = notes;
		this.actors = actors;
		this.rateLimiter = rateLimiter;
		this.access = access;
	}

	@Transactional(readOnly = true)
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
		return response(note, actor.id().equals(note.getAuthorUserId()));
	}

	private NoteOpenResponse response(Note note, boolean isMine) {
		return new NoteOpenResponse(note.getId(), note.getContent(), isMine, note.getCreatedAt(),
			note.getVisibility(), note.getColor(), note.getPlaceName(), note.getNeighborhood());
	}
}
