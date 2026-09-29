package com.yeoginamgim.notification.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.BearerTokenExtractor;
import com.yeoginamgim.notification.dto.NearbyNotificationRequest;
import com.yeoginamgim.notification.dto.NearbyNotificationResponse;
import com.yeoginamgim.notification.service.NearbyNotificationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/notifications/nearby")
public class NearbyNotificationController {
	private final NearbyNotificationService service;
	private final BearerTokenExtractor bearerTokenExtractor;

	public NearbyNotificationController(NearbyNotificationService service,
		BearerTokenExtractor bearerTokenExtractor) {
		this.service = service;
		this.bearerTokenExtractor = bearerTokenExtractor;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<NearbyNotificationResponse>> check(
		@RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
		@Valid @ModelAttribute NearbyNotificationRequest request
	) {
		String guestToken = bearerTokenExtractor.extract(authorizationHeader);
		return ResponseEntity.ok(ApiResponse.success(service.check(guestToken, request)));
	}
}
