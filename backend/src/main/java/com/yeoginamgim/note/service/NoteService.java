package com.yeoginamgim.note.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.note.dto.MyNoteResponse;
import com.yeoginamgim.note.dto.MyNotesResponse;
import com.yeoginamgim.note.dto.NotePageRequest;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.dto.NoteCreateRequest;
import com.yeoginamgim.note.dto.NoteCreateResponse;
import com.yeoginamgim.note.repository.NoteRepository;

@Service
public class NoteService {
	private final NoteRepository noteRepository;
	private final NoteActorProvider actors;

	public NoteService(NoteRepository noteRepository, NoteActorProvider actors) {
		this.noteRepository = noteRepository;
		this.actors = actors;
	}

	@Transactional
	public NoteCreateResponse create(String token, NoteCreateRequest request) {
		NoteActorProvider.Actor actor = actors.identify(token);
		Instant createdAt = Instant.now();
		if (request.visibility() == null) {
			throw new InvalidNoteRequestException("회원 쪽지는 visibility가 필요합니다.");
		}
		Note note = Note.createMember(UUID.randomUUID(), actor.id(), request.content().strip(),
			request.latitude(), request.longitude(), createdAt, request.visibility(),
			request.color(), optionalLabel(request.placeName()), optionalLabel(request.neighborhood()));
		noteRepository.save(note);

		return new NoteCreateResponse(note.getId(), createdAt);
	}

	@Transactional(readOnly = true)
	public MyNotesResponse findMine(UUID userId, NotePageRequest request) {
		var page = PageRequest.of(request.page(), request.size(), Sort.by(
			Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
		var notes = noteRepository.findByAuthorUserId(userId, page);
		return new MyNotesResponse(notes.getContent().stream().map(MyNoteResponse::from).toList(),
			request.page(), request.size(), notes.hasNext());
	}

	private String optionalLabel(String value) {
		return value == null || value.isBlank() ? null : value.strip();
	}
}
