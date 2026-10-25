package com.yeoginamgim.auth.controller;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.auth.dto.AuthRequests.ConfirmRequest;
import com.yeoginamgim.auth.dto.AuthRequests.EmailRequest;
import com.yeoginamgim.auth.dto.AuthRequests.LoginRequest;
import com.yeoginamgim.auth.dto.AuthRequests.SignupRequest;
import com.yeoginamgim.auth.dto.AuthResponses.AccessToken;
import com.yeoginamgim.auth.dto.AuthResponses.EmailConfirmed;
import com.yeoginamgim.auth.dto.AuthResponses.Profile;
import com.yeoginamgim.auth.dto.AuthResponses.VerificationRequested;
import com.yeoginamgim.auth.service.EmailVerificationService;
import com.yeoginamgim.auth.service.MemberAuthService;
import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.rate.FixedWindowRateLimiter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class MemberAuthController {
	private final MemberAuthService auth;
	private final EmailVerificationService verification;
	private final FixedWindowRateLimiter limiter;

	public MemberAuthController(MemberAuthService auth, EmailVerificationService verification,
		FixedWindowRateLimiter limiter) {
		this.auth = auth;
		this.verification = verification;
		this.limiter = limiter;
	}

	@PostMapping("/email-verifications")
	public ResponseEntity<ApiResponse<VerificationRequested>> request(
		@Valid @RequestBody EmailRequest body, HttpServletRequest request) {
		limit("email-request-ip", request.getRemoteAddr(), 10);
		return ResponseEntity.status(HttpStatus.ACCEPTED).cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(verification.request(body.email())));
	}

	@PostMapping("/email-verifications/confirm")
	public ResponseEntity<ApiResponse<EmailConfirmed>> confirm(@Valid @RequestBody ConfirmRequest body, HttpServletRequest request) {
		limit("email-confirm-ip", request.getRemoteAddr(), 30);
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(verification.confirm(body.email(), body.verificationId(), body.code())));
	}

	@PostMapping("/signup")
	public ResponseEntity<ApiResponse<Profile>> signup(@Valid @RequestBody SignupRequest body, HttpServletRequest request) {
		limit("signup-ip", request.getRemoteAddr(), 5);
		return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(ApiResponse.success(auth.signup(body)));
	}

	@PostMapping("/login")
	public ResponseEntity<ApiResponse<AccessToken>> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
		limit("login-ip", request.getRemoteAddr(), 20);
		limit("login-email", body.email(), 10);
		return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.success(auth.login(body)));
	}

	private void limit(String scope, String identity, int max) {
		limiter.check(scope, UUID.nameUUIDFromBytes(identity.getBytes(StandardCharsets.UTF_8)), max);
	}
}
