package com.yeoginamgim.user.service;

import java.util.UUID;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.bookmark.service.BookmarkQueryService;
import com.yeoginamgim.friend.service.FriendshipQueryService;
import com.yeoginamgim.note.repository.NoteRepository;
import com.yeoginamgim.user.dto.MemberStatsResponse;

@Service
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class MemberStatsService {
	private final NoteRepository notes;
	private final FriendshipQueryService friends;
	private final ObjectProvider<BookmarkQueryService> bookmarks;

	public MemberStatsService(NoteRepository notes, FriendshipQueryService friends,
		ObjectProvider<BookmarkQueryService> bookmarks) {
		this.notes = notes;
		this.friends = friends;
		this.bookmarks = bookmarks;
	}

	@Transactional(readOnly = true)
	public MemberStatsResponse find(UUID userId) {
		BookmarkQueryService source = bookmarks.getIfAvailable();
		Long savedCount = source == null ? null : source.countSavedNotes(userId);
		return new MemberStatsResponse(notes.countByAuthorUserId(userId), friends.countFriends(userId), savedCount);
	}
}
