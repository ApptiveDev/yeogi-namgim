package com.yeoginamgim.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.notification.dto.NearbyNotificationRequest;
import com.yeoginamgim.notification.repository.NearbyNotificationRepository;

class NearbyNotificationServiceTests {
	private final GuestSessionService guestSessionService = mock(GuestSessionService.class);
	private final NearbyNotificationRepository notificationRepository = mock(NearbyNotificationRepository.class);
	private final NearbyNotificationService service = new NearbyNotificationService(guestSessionService, notificationRepository);

	@Test
	void checksPresenceOnlyAfterIdentifyingGuest() {
		when(guestSessionService.identify("guest-token")).thenReturn(UUID.randomUUID());
		when(notificationRepository.existsWithinRadius(35.1797, 129.0755)).thenReturn(true);

		var response = service.check("guest-token", new NearbyNotificationRequest(35.1797, 129.0755));

		assertThat(response.hasNearbyNotes()).isTrue();
		verify(guestSessionService).identify("guest-token");
		verify(notificationRepository).existsWithinRadius(35.1797, 129.0755);
	}
}
