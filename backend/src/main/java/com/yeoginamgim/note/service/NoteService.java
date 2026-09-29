package com.yeoginamgim.note.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.dto.NoteCreateRequest;
import com.yeoginamgim.note.dto.NoteCreateResponse;
import com.yeoginamgim.note.repository.NoteRepository;

@Service
public class NoteService {
	private final NoteRepository noteRepository;
	private final GuestSessionService guestSessionService;

	public NoteService(NoteRepository noteRepository, GuestSessionService guestSessionService) {
		this.noteRepository = noteRepository;
		this.guestSessionService = guestSessionService;
	}

	@Transactional
	public NoteCreateResponse create(String guestToken, NoteCreateRequest request) {
		UUID guestAuthorId = guestSessionService.identify(guestToken);
		Instant createdAt = Instant.now();
		Note note = Note.create(
			UUID.randomUUID(),
			guestAuthorId,
			request.content().trim(),
			request.latitude(),
			request.longitude(),
			createdAt
		);
		noteRepository.save(note);

		return new NoteCreateResponse(note.getId(), createdAt);
	}
}
