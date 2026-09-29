package com.yeoginamgim.location.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.BearerTokenExtractor;
import com.yeoginamgim.location.dto.CurrentLocationRequest;
import com.yeoginamgim.location.dto.CurrentLocationResponse;
import com.yeoginamgim.location.service.CurrentLocationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/locations/current")
public class CurrentLocationController {
	private final CurrentLocationService locationService;
	private final BearerTokenExtractor bearerTokenExtractor;

	public CurrentLocationController(CurrentLocationService locationService, BearerTokenExtractor bearerTokenExtractor) {
		this.locationService = locationService;
		this.bearerTokenExtractor = bearerTokenExtractor;
	}

	@PatchMapping
	public ResponseEntity<ApiResponse<CurrentLocationResponse>> update(
		@RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
		@Valid @RequestBody CurrentLocationRequest request
	) {
		String guestToken = bearerTokenExtractor.extract(authorizationHeader);
		return ResponseEntity.ok(ApiResponse.success(locationService.update(guestToken, request)));
	}
}
