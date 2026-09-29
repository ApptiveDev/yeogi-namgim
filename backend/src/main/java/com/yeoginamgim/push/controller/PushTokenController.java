package com.yeoginamgim.push.controller;

import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.BearerTokenExtractor;
import com.yeoginamgim.push.dto.PushTokenRegisterRequest;
import com.yeoginamgim.push.dto.PushTokenRegisterResponse;
import com.yeoginamgim.push.dto.PushTokenStatusRequest;
import com.yeoginamgim.push.service.PushTokenService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/push-tokens")
public class PushTokenController {
	private final PushTokenService pushTokenService;
	private final BearerTokenExtractor bearerTokenExtractor;

	public PushTokenController(PushTokenService pushTokenService, BearerTokenExtractor bearerTokenExtractor) {
		this.pushTokenService = pushTokenService;
		this.bearerTokenExtractor = bearerTokenExtractor;
	}

	@PostMapping
	public ResponseEntity<ApiResponse<PushTokenRegisterResponse>> register(
		@RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
		@Valid @RequestBody PushTokenRegisterRequest request
	) {
		String guestToken = bearerTokenExtractor.extract(authorizationHeader);
		return ResponseEntity.status(HttpStatus.CREATED)
			.body(ApiResponse.success(pushTokenService.register(guestToken, request)));
	}

	@PatchMapping("/{tokenId}")
	public ResponseEntity<ApiResponse<Void>> setEnabled(
		@RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
		@PathVariable UUID tokenId,
		@Valid @RequestBody PushTokenStatusRequest request
	) {
		String guestToken = bearerTokenExtractor.extract(authorizationHeader);
		pushTokenService.setEnabled(guestToken, tokenId, request.enabled());
		return ResponseEntity.ok(ApiResponse.success(null));
	}
}
