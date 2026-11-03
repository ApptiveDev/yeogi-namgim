package com.yeoginamgim.user;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import com.yeoginamgim.bookmark.service.BookmarkQueryService;
import com.yeoginamgim.friend.service.FriendshipQueryService;
import com.yeoginamgim.note.repository.NoteRepository;
import com.yeoginamgim.user.service.MemberStatsService;

class MemberStatsServiceTests {
	@Test
	void connectedBookmarkSourceReturnsActualCountIncludingZeroAndLongValues() {
		UUID userId = UUID.randomUUID();
		BookmarkQueryService bookmarks = mock(BookmarkQueryService.class);
		StaticListableBeanFactory beans = new StaticListableBeanFactory();
		beans.addBean("bookmarks", bookmarks);
		var service = new MemberStatsService(mock(NoteRepository.class), mock(FriendshipQueryService.class),
			beans.getBeanProvider(BookmarkQueryService.class));
		when(bookmarks.countSavedNotes(userId)).thenReturn(0L, 3_000_000_000L);
		assertThat(service.find(userId).savedNoteCount()).isZero();
		assertThat(service.find(userId).savedNoteCount()).isEqualTo(3_000_000_000L);
		verify(bookmarks, times(2)).countSavedNotes(userId);
	}

	@Test
	void bookmarkFailureIsNotReportedAsAnEmptyOrUnconnectedSource() {
		UUID userId = UUID.randomUUID();
		BookmarkQueryService bookmarks = mock(BookmarkQueryService.class);
		StaticListableBeanFactory beans = new StaticListableBeanFactory();
		beans.addBean("bookmarks", bookmarks);
		var service = new MemberStatsService(mock(NoteRepository.class), mock(FriendshipQueryService.class),
			beans.getBeanProvider(BookmarkQueryService.class));
		when(bookmarks.countSavedNotes(userId)).thenThrow(new DataAccessResourceFailureException("unavailable"));
		assertThatThrownBy(() -> service.find(userId)).isInstanceOf(DataAccessResourceFailureException.class);
	}
}
