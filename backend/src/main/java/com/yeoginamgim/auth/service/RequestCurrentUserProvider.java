package com.yeoginamgim.auth.service;

import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.yeoginamgim.common.auth.BearerTokenExtractor;
import com.yeoginamgim.common.auth.CurrentUserProvider;
import com.yeoginamgim.guest.service.InvalidGuestTokenException;
import com.yeoginamgim.user.repository.MemberRepository;

import jakarta.servlet.http.HttpServletRequest;

@Component
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class RequestCurrentUserProvider implements CurrentUserProvider {
	private final HttpServletRequest request;
	private final BearerTokenExtractor extractor;
	private final AccessTokenCodec tokens;
	private final MemberRepository members;

	public RequestCurrentUserProvider(HttpServletRequest request, BearerTokenExtractor extractor,
		AccessTokenCodec tokens, MemberRepository members) {
		this.request = request;
		this.extractor = extractor;
		this.tokens = tokens;
		this.members = members;
	}

	@Override
	public UUID requireUserId() {
		try {
			UUID userId = tokens.identify(extractor.extract(request.getHeader("Authorization")));
			if (!members.existsById(userId)) throw AuthException.unauthorized();
			return userId;
		} catch (InvalidGuestTokenException exception) {
			throw AuthException.unauthorized();
		}
	}
}
