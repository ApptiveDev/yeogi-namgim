package com.yeoginamgim.user.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.auth.dto.AuthResponses.Profile;
import com.yeoginamgim.auth.service.MemberAuthService;
import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.CurrentUserProvider;

@RestController
@RequestMapping("/api/v1/users")
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class MemberProfileController {
	private final CurrentUserProvider currentUser;
	private final MemberAuthService auth;

	public MemberProfileController(CurrentUserProvider currentUser, MemberAuthService auth) {
		this.currentUser = currentUser;
		this.auth = auth;
	}

	@GetMapping("/me")
	public ResponseEntity<ApiResponse<Profile>> me() {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(auth.profile(currentUser.requireUserId())));
	}
}
