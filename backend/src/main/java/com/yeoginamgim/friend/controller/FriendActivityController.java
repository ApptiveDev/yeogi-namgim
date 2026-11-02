package com.yeoginamgim.friend.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.CurrentUserProvider;
import com.yeoginamgim.friend.dto.FriendActivityResponse;
import com.yeoginamgim.friend.dto.FriendPageRequest;
import com.yeoginamgim.friend.service.FriendActivityService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/friends/activities")
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class FriendActivityController {
	private final CurrentUserProvider currentUser;
	private final FriendActivityService activities;

	public FriendActivityController(CurrentUserProvider currentUser, FriendActivityService activities) {
		this.currentUser = currentUser;
		this.activities = activities;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<FriendActivityResponse>> list(@Valid @ModelAttribute FriendPageRequest page) {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(activities.find(currentUser.requireUserId(), page)));
	}
}
