package com.yeoginamgim.common.auth;

import org.springframework.stereotype.Component;

import com.yeoginamgim.guest.service.InvalidGuestTokenException;

@Component
public class BearerTokenExtractor {
	private static final String BEARER_PREFIX = "Bearer ";

	public String extract(String authorizationHeader) {
		if (authorizationHeader == null
			|| !authorizationHeader.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
			throw new InvalidGuestTokenException();
		}

		String token = authorizationHeader.substring(BEARER_PREFIX.length()).trim();
		if (token.isEmpty()) {
			throw new InvalidGuestTokenException();
		}
		return token;
	}
}
