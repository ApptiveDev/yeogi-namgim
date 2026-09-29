package com.yeoginamgim.push.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.push.domain.PushPlatform;
import com.yeoginamgim.push.domain.PushToken;
import com.yeoginamgim.push.dto.PushTokenRegisterRequest;
import com.yeoginamgim.push.repository.PushTokenRepository;

class PushTokenServiceTests {
	private final GuestSessionService guestSessionService = mock(GuestSessionService.class);
	private final PushTokenRepository repository = mock(PushTokenRepository.class);
	private final PushTokenService service = new PushTokenService(guestSessionService, repository);

	@Test
	void registersAndReenablesOwnToken() {
		UUID guestId = UUID.randomUUID();
		PushToken existing = PushToken.create(UUID.randomUUID(), guestId, PushPlatform.ANDROID,
			"device-token-123", Instant.now());
		existing.setEnabled(false);
		when(guestSessionService.identify("guest-token")).thenReturn(guestId);
		when(repository.findByPushToken("device-token-123")).thenReturn(Optional.of(existing));
		var response = service.register("guest-token", new PushTokenRegisterRequest(PushPlatform.IOS, "device-token-123"));
		assertThat(response.pushTokenId()).isEqualTo(existing.getId());
		assertThat(existing.isEnabled()).isTrue();
		assertThat(existing.getPlatform()).isEqualTo(PushPlatform.IOS);
	}

	@Test
	void rejectsTokenOwnedByDifferentGuest() {
		when(guestSessionService.identify("guest-token")).thenReturn(UUID.randomUUID());
		when(repository.findByPushToken("device-token-123")).thenReturn(Optional.of(
			PushToken.create(UUID.randomUUID(), UUID.randomUUID(), PushPlatform.ANDROID,
				"device-token-123", Instant.now())));
		assertThatThrownBy(() -> service.register("guest-token",
			new PushTokenRegisterRequest(PushPlatform.ANDROID, "device-token-123")))
			.isInstanceOf(PushTokenConflictException.class);
	}

	@Test
	void storesNewTokenAndAllowsOwnerToDisable() {
		UUID guestId = UUID.randomUUID();
		when(guestSessionService.identify("guest-token")).thenReturn(guestId);
		when(repository.findByPushToken("device-token-123")).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any(PushToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
		var response = service.register("guest-token",
			new PushTokenRegisterRequest(PushPlatform.ANDROID, "device-token-123"));
		PushToken stored = PushToken.create(response.pushTokenId(), guestId, PushPlatform.ANDROID,
			"device-token-123", response.createdAt());
		when(repository.findById(response.pushTokenId())).thenReturn(Optional.of(stored));
		service.setEnabled("guest-token", response.pushTokenId(), false);
		assertThat(stored.isEnabled()).isFalse();
		verify(repository).saveAndFlush(any(PushToken.class));
	}
}
