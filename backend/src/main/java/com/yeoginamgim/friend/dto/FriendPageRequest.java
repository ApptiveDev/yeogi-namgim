package com.yeoginamgim.friend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record FriendPageRequest(@Min(0) @Max(10000) Integer page, @Min(1) @Max(100) Integer size) {
	public FriendPageRequest {
		if (page == null) page = 0;
		if (size == null) size = 20;
	}
}
