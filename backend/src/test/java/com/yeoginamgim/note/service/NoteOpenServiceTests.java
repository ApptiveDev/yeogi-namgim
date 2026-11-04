package com.yeoginamgim.note.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import com.yeoginamgim.common.rate.FixedWindowRateLimiter;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.dto.NoteOpenRequest;
import com.yeoginamgim.note.repository.NoteRepository;

class NoteOpenServiceTests {
	private final NoteRepository noteRepository = mock(NoteRepository.class);
	private final NoteActorProvider actors = mock(NoteActorProvider.class);
	private final com.yeoginamgim.note.access.NoteAccessService access = mock(com.yeoginamgim.note.access.NoteAccessService.class);
	private final NoteOpenService noteOpenService = new NoteOpenService(noteRepository, actors, new FixedWindowRateLimiter(), access);

	@Test
	void opensNearbyNoteIncludingOwnNote() {
		UUID userId = UUID.randomUUID();
		Note note = Note.createMember(UUID.randomUUID(), userId, "내용", 35.0, 129.0, java.time.Instant.now(), com.yeoginamgim.note.domain.NoteVisibility.PUBLIC, null, null, null);
		when(actors.identify("member-token")).thenReturn(new NoteActorProvider.Actor(userId));
		when(noteRepository.findById(note.getId())).thenReturn(Optional.of(note));
		when(access.evaluate(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).thenReturn(java.util.Map.of(note.getId(), new com.yeoginamgim.note.access.NoteAccessResult(com.yeoginamgim.note.access.NoteAccessStatus.OPENABLE, 0.0)));
		var response = noteOpenService.open("member-token", note.getId(),
			new NoteOpenRequest(35.0, 129.0, 10.0, java.time.Instant.now()));
		assertThat(response.content()).isEqualTo("내용");
		assertThat(response.isMine()).isTrue();
	}

}
