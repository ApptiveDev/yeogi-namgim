package com.yeoginamgim.note.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.guest.service.GuestSessionService;
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
}
