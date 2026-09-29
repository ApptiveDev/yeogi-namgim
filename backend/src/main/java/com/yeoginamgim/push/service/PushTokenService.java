package com.yeoginamgim.push.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.push.domain.PushToken;
import com.yeoginamgim.push.dto.PushTokenRegisterRequest;
import com.yeoginamgim.push.dto.PushTokenRegisterResponse;
import com.yeoginamgim.push.repository.PushTokenRepository;

@Service
public class PushTokenService {
	private final GuestSessionService guestSessionService;
	private final PushTokenRepository pushTokenRepository;

	public PushTokenService(GuestSessionService guestSessionService, PushTokenRepository pushTokenRepository) {
		this.guestSessionService = guestSessionService;
		this.pushTokenRepository = pushTokenRepository;
	}

	@Transactional
	public PushTokenRegisterResponse register(String guestToken, PushTokenRegisterRequest request) {
		UUID guestId = guestSessionService.identify(guestToken);
		PushToken token = pushTokenRepository.findByPushToken(request.pushToken())
			.map(existing -> {
				if (!existing.getGuestId().equals(guestId)) {
					throw new PushTokenConflictException();
				}
				existing.setPlatform(request.platform());
				existing.setEnabled(true);
				return existing;
			})
			.orElseGet(() -> createToken(guestId, request));
		return new PushTokenRegisterResponse(token.getId(), token.getPlatform(), token.getCreatedAt());
	}

	private PushToken createToken(UUID guestId, PushTokenRegisterRequest request) {
		try {
			return pushTokenRepository.saveAndFlush(PushToken.create(
				UUID.randomUUID(), guestId, request.platform(), request.pushToken(), Instant.now()
			));
		} catch (DataIntegrityViolationException exception) {
			throw new PushTokenConflictException();
		}
	}

	@Transactional
	public void setEnabled(String guestToken, UUID tokenId, boolean enabled) {
		UUID guestId = guestSessionService.identify(guestToken);
		PushToken token = pushTokenRepository.findById(tokenId)
			.filter(found -> found.getGuestId().equals(guestId))
			.orElseThrow(PushTokenNotFoundException::new);
		token.setEnabled(enabled);
	}
}
