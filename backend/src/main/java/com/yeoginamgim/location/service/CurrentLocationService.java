package com.yeoginamgim.location.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.location.domain.GuestLocation;
import com.yeoginamgim.location.dto.CurrentLocationRequest;
import com.yeoginamgim.location.dto.CurrentLocationResponse;
import com.yeoginamgim.location.repository.GuestLocationRepository;

@Service
public class CurrentLocationService {
	private final GuestSessionService guestSessionService;
	private final GuestLocationRepository locationRepository;

	public CurrentLocationService(GuestSessionService guestSessionService, GuestLocationRepository locationRepository) {
		this.guestSessionService = guestSessionService;
		this.locationRepository = locationRepository;
	}

	@Transactional
	public CurrentLocationResponse update(String guestToken, CurrentLocationRequest request) {
		UUID guestId = guestSessionService.identify(guestToken);
		Instant now = Instant.now();
		GuestLocation location = locationRepository.findById(guestId)
			.orElseGet(() -> new GuestLocation(guestId, request.latitude(), request.longitude(), now));
		location.update(request.latitude(), request.longitude(), now);
		locationRepository.save(location);
		return new CurrentLocationResponse(location.getLatitude(), location.getLongitude(), location.getUpdatedAt());
	}
}
