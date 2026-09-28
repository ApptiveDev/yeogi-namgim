package com.yeoginamgim.guest.dto;

import java.util.UUID;

public record GuestSessionCreateResponse(
	UUID guestId,
	String guestToken,
	String tokenType
) {
}

