package com.yeoginamgim.friend.service;

import org.springframework.http.HttpStatus;

public class FriendException extends RuntimeException {
	private final HttpStatus status;
	private final String code;

	private FriendException(HttpStatus status, String code, String message) {
		super(message);
		this.status = status;
		this.code = code;
	}

	public HttpStatus getStatus() { return status; }
	public String getCode() { return code; }

	public static FriendException invalidInvitation() {
		return new FriendException(HttpStatus.BAD_REQUEST, "FRIEND_INVITATION_INVALID",
			"초대 코드가 없거나 만료되었거나 이미 사용되었습니다.");
	}

	public static FriendException selfInvitation() {
		return new FriendException(HttpStatus.BAD_REQUEST, "FRIEND_SELF_INVITATION", "자신의 초대는 수락할 수 없습니다.");
	}

	public static FriendException alreadyFriends() {
		return new FriendException(HttpStatus.CONFLICT, "FRIEND_ALREADY_EXISTS", "이미 친구 관계입니다.");
	}
}
