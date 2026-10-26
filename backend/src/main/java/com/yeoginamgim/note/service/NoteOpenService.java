package com.yeoginamgim.note.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.common.rate.FixedWindowRateLimiter;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.dto.NoteOpenRequest;
import com.yeoginamgim.note.dto.NoteOpenResponse;
import com.yeoginamgim.note.repository.NoteRepository;

/** Entry point for the opening/bookmark owner to extend member access and discovery policies. */
@Service
public class NoteOpenService {
	private final NoteRepository notes;
	private final NoteActorProvider actors;
	private final FixedWindowRateLimiter rateLimiter;

	public NoteOpenService(NoteRepository notes, NoteActorProvider actors, FixedWindowRateLimiter rateLimiter) {
		this.notes = notes;
		this.actors = actors;
		this.rateLimiter = rateLimiter;
	}

	@Transactional(readOnly = true)
	public NoteOpenResponse open(String token, UUID noteId, NoteOpenRequest request) {
		var actor = actors.identify(token);
		rateLimiter.check(actor.member() ? "member-note-open" : "note-open", actor.id(), 60);
		if (actor.member()) {
			// Other members' notes stay hidden until friendship/access policies are implemented.
			Note note = notes.findByIdAndAuthorUserId(noteId, actor.id()).orElseThrow(NoteNotFoundException::new);
			return response(note, true);
		}
		if (request == null || request.latitude() == null || request.longitude() == null) {
			throw new InvalidNoteRequestException("비회원 열람에는 latitude와 longitude가 필요합니다.");
		}
		Note note = notes.findOpenableById(noteId, request.latitude(), request.longitude())
			.orElseThrow(() -> notes.existsByIdAndGuestAuthorIdIsNotNull(noteId)
				? new NoteLockedException() : new NoteNotFoundException());
		return response(note, actor.id().equals(note.getGuestAuthorId()));
	}

	private NoteOpenResponse response(Note note, boolean isMine) {
		return new NoteOpenResponse(note.getId(), note.getContent(), isMine, note.getCreatedAt(),
			note.getVisibility(), note.getColor(), note.getPlaceName(), note.getNeighborhood());
	}
}
