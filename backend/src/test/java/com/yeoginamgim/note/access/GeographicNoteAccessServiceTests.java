package com.yeoginamgim.note.access;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.ObjectProvider;

import com.yeoginamgim.bookmark.service.BookmarkQueryService;
import com.yeoginamgim.friend.service.FriendshipQueryService;
import com.yeoginamgim.note.domain.NoteVisibility;
import com.yeoginamgim.note.repository.MemberNoteMapRepository;

class GeographicNoteAccessServiceTests {
	private final UUID viewer = UUID.randomUUID();
	private final UUID author = UUID.randomUUID();
	private final UUID id = UUID.randomUUID();
	private final FriendshipQueryService friends = mock(FriendshipQueryService.class);
	private final MemberNoteMapRepository notes = mock(MemberNoteMapRepository.class);
	@SuppressWarnings("unchecked")
	private final ObjectProvider<BookmarkQueryService> bookmarks = mock(ObjectProvider.class);
	private final GeographicNoteAccessService service = new GeographicNoteAccessService(friends, bookmarks, notes);

	@ParameterizedTest
	@CsvSource({"149.999, OPENABLE", "150.0, OPENABLE", "150.001, LOCKED", "175.0, LOCKED", "200.0, LOCKED"})
	void appliesInclusive150MeterLimit(double meters, NoteAccessStatus expected) {
		when(friends.findFriendIds(any(), any())).thenReturn(Set.of());
		when(notes.findDistances(any(), any())).thenReturn(Map.of(id, meters));
		assertThat(service.evaluate(viewer, new LocationInput(35.0, 129.0, null, null),
			List.of(target(author, NoteVisibility.PUBLIC))).get(id).status()).isEqualTo(expected);
	}

	@Test
	void ownAndSavedNotesRemainOpenableWithoutLocation() {
		when(friends.findFriendIds(any(), any())).thenReturn(Set.of());
		when(notes.findDistances(any(), any())).thenReturn(Map.of());
		assertThat(service.evaluate(viewer, null, List.of(target(viewer, NoteVisibility.PRIVATE)))
			.get(id).status()).isEqualTo(NoteAccessStatus.OPENABLE);
		var saved = mock(BookmarkQueryService.class);
		when(bookmarks.getIfAvailable()).thenReturn(saved);
		when(saved.findSavedAt(any(), any())).thenReturn(Map.of(id, Instant.now()));
		assertThat(service.evaluate(viewer, null, List.of(target(author, NoteVisibility.PUBLIC)))
			.get(id).status()).isEqualTo(NoteAccessStatus.OPENABLE);
		assertThat(service.evaluate(viewer, null, List.of(target(author, NoteVisibility.PRIVATE)))
			.get(id).status()).isEqualTo(NoteAccessStatus.HIDDEN);
	}

	private NoteAccessTarget target(UUID owner, NoteVisibility visibility) {
		return new NoteAccessTarget(id, owner, visibility, 35, 129);
	}
}
