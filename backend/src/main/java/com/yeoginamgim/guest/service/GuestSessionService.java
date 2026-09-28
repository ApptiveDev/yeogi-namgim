package com.yeoginamgim.guest.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.guest.domain.GuestSession;
import com.yeoginamgim.guest.dto.GuestSessionCreateResponse;
import com.yeoginamgim.guest.repository.GuestSessionRepository;

@Service
public class GuestSessionService {
	private static final String TOKEN_TYPE = "Bearer";

	private final GuestSessionRepository guestSessionRepository;
	private final GuestTokenCodec guestTokenCodec;

	public GuestSessionService(
		GuestSessionRepository guestSessionRepository,
		GuestTokenCodec guestTokenCodec
	) {
		this.guestSessionRepository = guestSessionRepository;
		this.guestTokenCodec = guestTokenCodec;
	}

	@Transactional
	public GuestSessionCreateResponse create() {
		UUID guestId = UUID.randomUUID();
		String guestToken = guestTokenCodec.issueToken();
		String tokenHash = guestTokenCodec.hash(guestToken);

		GuestSession guestSession = GuestSession.create(guestId, tokenHash, Instant.now());
		guestSessionRepository.save(guestSession);

		return new GuestSessionCreateResponse(guestId, guestToken, TOKEN_TYPE);
	}

	@Transactional(readOnly = true)
	public UUID identify(String guestToken) {
		String tokenHash = guestTokenCodec.hash(guestToken);
		return guestSessionRepository.findByTokenHash(tokenHash)
			.map(GuestSession::getId)
			.orElseThrow(InvalidGuestTokenException::new);
	}
}

