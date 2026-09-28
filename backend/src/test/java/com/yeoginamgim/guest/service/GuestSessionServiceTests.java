package com.yeoginamgim.guest.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.yeoginamgim.guest.domain.GuestSession;
import com.yeoginamgim.guest.dto.GuestSessionCreateResponse;
import com.yeoginamgim.guest.repository.GuestSessionRepository;

class GuestSessionServiceTests {
	private final GuestSessionRepository repository = mock(GuestSessionRepository.class);
	private final GuestTokenCodec tokenCodec = new GuestTokenCodec();
	private final GuestSessionService service = new GuestSessionService(repository, tokenCodec);

	@Test
	void createsGuestSessionAndReturnsRawToken() {
		when(repository.save(any(GuestSession.class)))
			.thenAnswer(invocation -> invocation.getArgument(0));

		GuestSessionCreateResponse response = service.create();

		ArgumentCaptor<GuestSession> captor = ArgumentCaptor.forClass(GuestSession.class);
		verify(repository).save(captor.capture());
		GuestSession savedSession = captor.getValue();

		assertThat(response.guestId()).isEqualTo(savedSession.getId());
		assertThat(response.tokenType()).isEqualTo("Bearer");
		assertThat(savedSession.getTokenHash()).isEqualTo(tokenCodec.hash(response.guestToken()));
		assertThat(savedSession.getTokenHash()).isNotEqualTo(response.guestToken());
		assertThat(savedSession.getCreatedAt()).isNotNull();
	}

	@Test
	void identifiesGuestByRawToken() {
		GuestSessionCreateResponse created = service.create();
		GuestSession session = GuestSession.create(
			created.guestId(),
			tokenCodec.hash(created.guestToken()),
			java.time.Instant.now()
		);
		when(repository.findByTokenHash(tokenCodec.hash(created.guestToken())))
			.thenReturn(Optional.of(session));

		assertThat(service.identify(created.guestToken())).isEqualTo(created.guestId());
	}

	@Test
	void rejectsUnknownGuestToken() {
		when(repository.findByTokenHash(any())).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.identify("unknown-token"))
			.isInstanceOf(InvalidGuestTokenException.class);
	}
}

