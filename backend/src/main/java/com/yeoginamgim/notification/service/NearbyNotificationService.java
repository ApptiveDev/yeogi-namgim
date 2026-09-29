package com.yeoginamgim.notification.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.notification.dto.NearbyNotificationRequest;
import com.yeoginamgim.notification.dto.NearbyNotificationResponse;
import com.yeoginamgim.notification.repository.NearbyNotificationRepository;

@Service
public class NearbyNotificationService {
	private final GuestSessionService guestSessionService;
	private final NearbyNotificationRepository notificationRepository;

	public NearbyNotificationService(GuestSessionService guestSessionService,
		NearbyNotificationRepository notificationRepository) {
		this.guestSessionService = guestSessionService;
		this.notificationRepository = notificationRepository;
	}

	@Transactional(readOnly = true)
	public NearbyNotificationResponse check(String guestToken, NearbyNotificationRequest request) {
		guestSessionService.identify(guestToken);
		return new NearbyNotificationResponse(notificationRepository.existsWithinRadius(
			request.latitude(), request.longitude()));
	}
}
