package com.yeoginamgim.note.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.dto.NoteCreateRequest;
import com.yeoginamgim.note.dto.NoteCreateResponse;
import com.yeoginamgim.note.dto.NoteMapBoundsRequest;
import com.yeoginamgim.note.dto.NoteMarkersResponse;
import com.yeoginamgim.note.dto.NoteOpenRequest;
import com.yeoginamgim.note.repository.NoteMarkerProjection;
import com.yeoginamgim.note.repository.NoteRepository;

class NoteServiceTests {
	@Test
	void opensNearbyNoteIncludingOwnNote() {
		UUID guestId = UUID.randomUUID();
		Note note = Note.create(UUID.randomUUID(), guestId, "내용", 35.0, 129.0, java.time.Instant.now());
		when(guestSessionService.identify("guest-token")).thenReturn(guestId);
		when(noteRepository.findOpenableById(note.getId(), 35.0, 129.0)).thenReturn(Optional.of(note));
		var response = noteService.open("guest-token", note.getId(), new NoteOpenRequest(35.0, 129.0));
		assertThat(response.content()).isEqualTo("내용");
		assertThat(response.isMine()).isTrue();
	}

	@Test
	void distinguishesLockedFromMissingWithoutReturningContent() {
		UUID noteId = UUID.randomUUID();
		when(guestSessionService.identify("guest-token")).thenReturn(UUID.randomUUID());
		when(noteRepository.findOpenableById(noteId, 35.0, 129.0)).thenReturn(Optional.empty());
		when(noteRepository.existsById(noteId)).thenReturn(true);
		assertThatThrownBy(() -> noteService.open("guest-token", noteId, new NoteOpenRequest(35.0, 129.0)))
			.isInstanceOf(NoteLockedException.class);
		when(noteRepository.existsById(noteId)).thenReturn(false);
		assertThatThrownBy(() -> noteService.open("guest-token", noteId, new NoteOpenRequest(35.0, 129.0)))
			.isInstanceOf(NoteNotFoundException.class);
	}
	private final NoteRepository noteRepository = mock(NoteRepository.class);
	private final GuestSessionService guestSessionService = mock(GuestSessionService.class);
	private final NoteService noteService = new NoteService(noteRepository, guestSessionService);

	@Test
	void createsNoteForIdentifiedGuestWithServerTime() {
		UUID guestId = UUID.randomUUID();
		when(guestSessionService.identify("guest-token")).thenReturn(guestId);
		NoteCreateRequest request = new NoteCreateRequest("  여기 남긴 쪽지  ", 35.1796, 129.0756);

		NoteCreateResponse response = noteService.create("guest-token", request);

		ArgumentCaptor<Note> captor = ArgumentCaptor.forClass(Note.class);
		verify(noteRepository).save(captor.capture());
		Note savedNote = captor.getValue();
		assertThat(savedNote.getGuestAuthorId()).isEqualTo(guestId);
		assertThat(savedNote.getContent()).isEqualTo("여기 남긴 쪽지");
		assertThat(savedNote.getLatitude()).isEqualTo(35.1796);
		assertThat(savedNote.getLongitude()).isEqualTo(129.0756);
		assertThat(savedNote.getCreatedAt()).isNotNull();
		assertThat(response.noteId()).isEqualTo(savedNote.getId());
		assertThat(response.createdAt()).isEqualTo(savedNote.getCreatedAt());
	}

	@Test
	void returnsMarkersWithMineFlagWithoutContent() {
		UUID guestId = UUID.randomUUID();
		UUID otherGuestId = UUID.randomUUID();
		NoteMarkerProjection mine = marker(UUID.randomUUID(), guestId, 35.1796, 129.0756);
		NoteMarkerProjection other = marker(UUID.randomUUID(), otherGuestId, 35.18, 129.08);
		when(guestSessionService.identify("guest-token")).thenReturn(guestId);
		when(noteRepository.findMarkersWithinBounds(35.17, 129.06, 35.19, 129.09))
			.thenReturn(List.of(mine, other));

		NoteMarkersResponse response = noteService.findMarkers(
			"guest-token",
			new NoteMapBoundsRequest(35.17, 129.06, 35.19, 129.09)
		);

		assertThat(response.notes()).hasSize(2);
		assertThat(response.notes().get(0).noteId()).isEqualTo(mine.getNoteId());
		assertThat(response.notes().get(0).isMine()).isTrue();
		assertThat(response.notes().get(1).noteId()).isEqualTo(other.getNoteId());
		assertThat(response.notes().get(1).isMine()).isFalse();
	}

	private NoteMarkerProjection marker(UUID noteId, UUID authorId, double latitude, double longitude) {
		NoteMarkerProjection marker = mock(NoteMarkerProjection.class);
		when(marker.getNoteId()).thenReturn(noteId);
		when(marker.getGuestAuthorId()).thenReturn(authorId);
		when(marker.getLatitude()).thenReturn(latitude);
		when(marker.getLongitude()).thenReturn(longitude);
		return marker;
	}
}
