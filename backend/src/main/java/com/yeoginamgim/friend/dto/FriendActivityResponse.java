package com.yeoginamgim.friend.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FriendActivityResponse(List<Activity> activities, int page, int size, boolean hasNext) {
	public record Activity(UUID noteId, UUID friendId, String nickname,
		String placeName, String neighborhood, Instant createdAt) { }
}
