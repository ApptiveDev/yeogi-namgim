package com.yeoginamgim.user.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import com.yeoginamgim.user.dto.ProfileUpdateRequest;
import com.yeoginamgim.user.service.MemberProfileService;
import com.yeoginamgim.user.service.MemberWithdrawalService;
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
	private final MemberProfileService profiles;
	private final MemberWithdrawalService withdrawal;

	public MemberProfileController(CurrentUserProvider currentUser, MemberAuthService auth, MemberProfileService profiles, MemberWithdrawalService withdrawal) {
		this.currentUser = currentUser;
		this.auth = auth;
		this.profiles = profiles;
		this.withdrawal = withdrawal;
	}

	@DeleteMapping("/me")
	public ResponseEntity<ApiResponse<java.util.Map<String, Boolean>>> withdraw() {
		withdrawal.withdraw(currentUser.requireUserId());
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(java.util.Map.of("withdrawn", true)));
	}

	@PatchMapping("/me")
	public ResponseEntity<ApiResponse<Profile>> update(@Valid @RequestBody ProfileUpdateRequest request) {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(profiles.update(currentUser.requireUserId(), request)));
	}

	@GetMapping("/me")
	public ResponseEntity<ApiResponse<Profile>> me() {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(auth.profile(currentUser.requireUserId())));
	}
}
