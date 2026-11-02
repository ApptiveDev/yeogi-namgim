package com.yeoginamgim.note.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.dto.NoteCreateRequest;
import com.yeoginamgim.note.dto.NoteCreateResponse;
import com.yeoginamgim.note.repository.NoteRepository;

class NoteServiceTests {
	private final NoteRepository noteRepository = mock(NoteRepository.class);
	private final NoteActorProvider actors = mock(NoteActorProvider.class);
	private final NoteService noteService = new NoteService(noteRepository, actors);

	@Test
	void createsNoteForIdentifiedMemberWithServerTime() {
		UUID userId = UUID.randomUUID();
		when(actors.identify("member-token")).thenReturn(new NoteActorProvider.Actor(userId));
		NoteCreateRequest request = new NoteCreateRequest("  여기 남긴 쪽지  ", 35.1796, 129.0756, com.yeoginamgim.note.domain.NoteVisibility.PUBLIC, null, null, null);

		NoteCreateResponse response = noteService.create("member-token", request);

		ArgumentCaptor<Note> captor = ArgumentCaptor.forClass(Note.class);
		verify(noteRepository).save(captor.capture());
		Note savedNote = captor.getValue();
		assertThat(savedNote.getAuthorUserId()).isEqualTo(userId);
		assertThat(savedNote.getContent()).isEqualTo("여기 남긴 쪽지");
		assertThat(savedNote.getLatitude()).isEqualTo(35.1796);
		assertThat(savedNote.getLongitude()).isEqualTo(129.0756);
		assertThat(savedNote.getCreatedAt()).isNotNull();
		assertThat(response.noteId()).isEqualTo(savedNote.getId());
		assertThat(response.createdAt()).isEqualTo(savedNote.getCreatedAt());
	}

}
