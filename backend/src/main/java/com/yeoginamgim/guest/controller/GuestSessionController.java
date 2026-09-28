package com.yeoginamgim.guest.controller;

import static org.springframework.http.HttpStatus.CREATED;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.guest.dto.GuestSessionCreateResponse;
import com.yeoginamgim.guest.service.GuestSessionService;

@RestController
@RequestMapping("/api/v1/guest-sessions")
public class GuestSessionController {
	private final GuestSessionService guestSessionService;

	public GuestSessionController(GuestSessionService guestSessionService) {
		this.guestSessionService = guestSessionService;
	}

	@PostMapping
	public ResponseEntity<ApiResponse<GuestSessionCreateResponse>> create() {
		GuestSessionCreateResponse response = guestSessionService.create();
		return ResponseEntity.status(CREATED).body(ApiResponse.success(response));
	}
}

