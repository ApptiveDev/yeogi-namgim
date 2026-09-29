package com.yeoginamgim.note.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.dto.NoteCreateRequest;
import com.yeoginamgim.note.dto.NoteCreateResponse;
import com.yeoginamgim.note.repository.NoteRepository;

class NoteServiceTests {
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
}
