package com.yeoginamgim.note.map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataAccessResourceFailureException;

import com.yeoginamgim.bookmark.service.BookmarkQueryService;
import com.yeoginamgim.common.rate.FixedWindowRateLimiter;
import com.yeoginamgim.note.access.NoteAccessResult;
import com.yeoginamgim.note.access.NoteAccessService;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.domain.NoteVisibility;
import com.yeoginamgim.note.dto.NoteMapBoundsRequest;
import com.yeoginamgim.note.repository.MemberMapCandidate;
import com.yeoginamgim.note.repository.MemberNoteMapRepository;
import com.yeoginamgim.note.repository.NoteRepository;
import com.yeoginamgim.note.service.MemberNoteMapService;
import com.yeoginamgim.note.service.NoteActorProvider;
import com.yeoginamgim.note.service.NoteNotFoundException;
import com.yeoginamgim.note.service.NoteOpenService;

class MapPermissionFailureTests {
	private final UUID id = UUID.randomUUID();
	private final UUID author = UUID.randomUUID();
	private final UUID user = UUID.randomUUID();
	private final MemberNoteMapRepository notes = mock(MemberNoteMapRepository.class);
	private final NoteAccessService access = mock(NoteAccessService.class);
	private final NoteMapBoundsRequest bounds = new NoteMapBoundsRequest(34.0, 128.0, 36.0, 130.0);

	@Test
	void missingOrNullPermissionNeverBecomesVisibleMarkerOrCard() {
		var service = new MemberNoteMapService(notes, access, provider(null), provider(null), provider(null));
		when(notes.find(user, bounds)).thenReturn(List.of(candidate()));
		for (Map<UUID, NoteAccessResult> decision : List.of(Map.<UUID, NoteAccessResult>of(), Map.of(id, new NoteAccessResult(null, 10.0)))) {
			when(access.evaluate(any(), any(), any())).thenReturn(decision);
			var result = service.find(user, bounds);
			assertThat(result.notes()).isEmpty();
			assertThat(result.openableNotes()).isEmpty();
		}
	}

	@Test
	void nullPermissionNeverReleasesDetailContent() {
		var repository = mock(NoteRepository.class);
		var actors = mock(NoteActorProvider.class);
		when(actors.identify("member")).thenReturn(new NoteActorProvider.Actor(user, true));
		when(repository.findById(id)).thenReturn(Optional.of(Note.createMember(id, author, "비밀", 35, 129,
			Instant.now(), NoteVisibility.PUBLIC, null, null, null)));
		when(access.evaluate(any(), any(), any())).thenReturn(Map.of(id, new NoteAccessResult(null, 10.0)));
		var service = new NoteOpenService(repository, actors, new FixedWindowRateLimiter(), access);
		assertThatThrownBy(() -> service.open("member", id, null)).isInstanceOf(NoteNotFoundException.class);
	}

	@Test
	void failedBookmarkQueryDoesNotBecomeAFalseEmptySuccess() {
		var bookmarks = mock(BookmarkQueryService.class);
		when(notes.find(user, bounds)).thenReturn(List.of(candidate()));
		when(bookmarks.findSavedAt(any(), any())).thenThrow(new DataAccessResourceFailureException("source unavailable"));
		var service = new MemberNoteMapService(notes, access, provider(bookmarks), provider(null), provider(null));
		assertThatThrownBy(() -> service.find(user, bounds)).isInstanceOf(DataAccessResourceFailureException.class);
	}

	private MemberMapCandidate candidate() {
		return new MemberMapCandidate(id, author, NoteVisibility.PUBLIC, "내용", 35, 129, Instant.now(), null, null, null, "작성자", 10.0);
	}

	@SuppressWarnings("unchecked")
	private <T> ObjectProvider<T> provider(T value) {
		ObjectProvider<T> provider = mock(ObjectProvider.class);
		when(provider.getIfAvailable()).thenReturn(value);
		return provider;
	}
}
