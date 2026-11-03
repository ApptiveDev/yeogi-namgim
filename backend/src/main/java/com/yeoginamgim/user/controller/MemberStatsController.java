package com.yeoginamgim.user.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.CurrentUserProvider;
import com.yeoginamgim.user.dto.MemberStatsResponse;
import com.yeoginamgim.user.service.MemberStatsService;

@RestController
@RequestMapping("/api/v1/users/me/stats")
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class MemberStatsController {
	private final CurrentUserProvider currentUser;
	private final MemberStatsService stats;

	public MemberStatsController(CurrentUserProvider currentUser, MemberStatsService stats) {
		this.currentUser = currentUser;
		this.stats = stats;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<MemberStatsResponse>> get() {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(stats.find(currentUser.requireUserId())));
	}
}
