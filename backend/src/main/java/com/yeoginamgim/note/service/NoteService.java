package com.yeoginamgim.note.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.note.dto.MyNoteResponse;
import com.yeoginamgim.note.dto.MyNotesResponse;
import com.yeoginamgim.note.dto.NotePageRequest;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.dto.NoteCreateRequest;
import com.yeoginamgim.note.dto.NoteCreateResponse;
import com.yeoginamgim.note.dto.NoteMapBoundsRequest;
import com.yeoginamgim.note.dto.NoteMarkerResponse;
import com.yeoginamgim.note.dto.NoteMarkersResponse;
import com.yeoginamgim.note.repository.NoteMarkerProjection;
import com.yeoginamgim.note.repository.NoteRepository;

@Service
public class NoteService {
	private final NoteRepository noteRepository;
	private final GuestSessionService guestSessionService;
	private final NoteActorProvider actors;

	public NoteService(NoteRepository noteRepository, GuestSessionService guestSessionService,
		NoteActorProvider actors) {
		this.noteRepository = noteRepository;
		this.guestSessionService = guestSessionService;
		this.actors = actors;
	}

	@Transactional
	public NoteCreateResponse create(String token, NoteCreateRequest request) {
		NoteActorProvider.Actor actor = actors.identify(token);
		Instant createdAt = Instant.now();
		Note note;
		if (actor.member()) {
			if (request.visibility() == null) {
				throw new InvalidNoteRequestException("회원 쪽지는 visibility가 필요합니다.");
			}
			note = Note.createMember(UUID.randomUUID(), actor.id(), request.content().strip(),
				request.latitude(), request.longitude(), createdAt, request.visibility(),
				request.color(), optionalLabel(request.placeName()), optionalLabel(request.neighborhood()));
		} else {
			if (request.visibility() != null || request.color() != null
				|| request.placeName() != null || request.neighborhood() != null) {
				throw new InvalidNoteRequestException("색상·공개 범위·장소를 지정하려면 회원 인증이 필요합니다.");
			}
			note = Note.create(UUID.randomUUID(), actor.id(), request.content().strip(),
				request.latitude(), request.longitude(), createdAt);
		}
		noteRepository.save(note);

		return new NoteCreateResponse(note.getId(), createdAt);
	}

	@Transactional(readOnly = true)
	public NoteMarkersResponse findMarkers(String guestToken, NoteMapBoundsRequest bounds) {
		UUID guestId = guestSessionService.identify(guestToken);
		List<NoteMarkerResponse> notes = noteRepository.findMarkersWithinBounds(
			bounds.minLatitude(),
			bounds.minLongitude(),
			bounds.maxLatitude(),
			bounds.maxLongitude()
		).stream()
			.map(note -> toMarkerResponse(note, guestId))
			.toList();
		return new NoteMarkersResponse(notes);
	}

	private NoteMarkerResponse toMarkerResponse(NoteMarkerProjection note, UUID guestId) {
		return new NoteMarkerResponse(
			note.getNoteId(),
			note.getLatitude(),
			note.getLongitude(),
			guestId.equals(note.getGuestAuthorId())
		);
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
