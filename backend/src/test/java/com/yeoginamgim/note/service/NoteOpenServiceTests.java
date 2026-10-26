package com.yeoginamgim.note.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
	private final NoteOpenService noteOpenService = new NoteOpenService(noteRepository, actors, new FixedWindowRateLimiter());

	@Test
	void opensNearbyNoteIncludingOwnNote() {
		UUID guestId = UUID.randomUUID();
		Note note = Note.create(UUID.randomUUID(), guestId, "내용", 35.0, 129.0, java.time.Instant.now());
		when(actors.identify("guest-token")).thenReturn(new NoteActorProvider.Actor(guestId, false));
		when(noteRepository.findOpenableById(note.getId(), 35.0, 129.0)).thenReturn(Optional.of(note));
		var response = noteOpenService.open("guest-token", note.getId(), new NoteOpenRequest(35.0, 129.0));
		assertThat(response.content()).isEqualTo("내용");
		assertThat(response.isMine()).isTrue();
	}

	@Test
	void distinguishesLockedFromMissingWithoutReturningContent() {
		UUID noteId = UUID.randomUUID();
		when(actors.identify("guest-token")).thenReturn(new NoteActorProvider.Actor(UUID.randomUUID(), false));
		when(noteRepository.findOpenableById(noteId, 35.0, 129.0)).thenReturn(Optional.empty());
		when(noteRepository.existsByIdAndGuestAuthorIdIsNotNull(noteId)).thenReturn(true);
		assertThatThrownBy(() -> noteOpenService.open("guest-token", noteId, new NoteOpenRequest(35.0, 129.0)))
			.isInstanceOf(NoteLockedException.class);
		when(noteRepository.existsByIdAndGuestAuthorIdIsNotNull(noteId)).thenReturn(false);
		assertThatThrownBy(() -> noteOpenService.open("guest-token", noteId, new NoteOpenRequest(35.0, 129.0)))
			.isInstanceOf(NoteNotFoundException.class);
	}
}
