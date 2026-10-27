package com.yeoginamgim.friend.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class FriendResponses {
	private FriendResponses() {}

	public record InvitationCreated(String code, Instant expiresAt) {
		@Override public String toString() { return "InvitationCreated[code=REDACTED, expiresAt=" + expiresAt + "]"; }
	}

	public record InvitationPreview(String inviterNickname, Instant expiresAt) {}
	public record Friend(UUID friendId, String nickname, Instant friendedAt) {}
	public record FriendList(List<Friend> friends, int page, int size, boolean hasNext) {}
}
