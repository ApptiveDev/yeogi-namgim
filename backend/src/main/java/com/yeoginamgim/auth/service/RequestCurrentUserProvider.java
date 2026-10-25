package com.yeoginamgim.auth.service;

import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.yeoginamgim.common.auth.BearerTokenExtractor;
import com.yeoginamgim.common.auth.CurrentUserProvider;
import com.yeoginamgim.guest.service.InvalidGuestTokenException;

import jakarta.servlet.http.HttpServletRequest;

@Component
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class RequestCurrentUserProvider implements CurrentUserProvider {
	private final HttpServletRequest request;
	private final BearerTokenExtractor extractor;
	private final MemberSessionService sessions;

	public RequestCurrentUserProvider(HttpServletRequest request, BearerTokenExtractor extractor,
		MemberSessionService sessions) {
		this.request = request;
		this.extractor = extractor;
		this.sessions = sessions;
	}

	@Override
	public UUID requireUserId() {
		try {
			return sessions.authenticate(extractor.extract(request.getHeader("Authorization")));
		} catch (InvalidGuestTokenException exception) {
			throw AuthException.unauthorized();
		}
	}
}
