package com.yeoginamgim.friend.controller;

import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.CurrentUserProvider;
import com.yeoginamgim.common.rate.FixedWindowRateLimiter;
import com.yeoginamgim.friend.dto.FriendPageRequest;
import com.yeoginamgim.friend.dto.FriendResponses.Friend;
import com.yeoginamgim.friend.dto.FriendResponses.FriendList;
import com.yeoginamgim.friend.dto.FriendResponses.InvitationCreated;
import com.yeoginamgim.friend.dto.FriendResponses.InvitationPreview;
import com.yeoginamgim.friend.service.FriendService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/friends")
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class FriendController {
	private final CurrentUserProvider currentUser;
	private final FriendService friends;
	private final FixedWindowRateLimiter limiter;

	public FriendController(CurrentUserProvider currentUser, FriendService friends, FixedWindowRateLimiter limiter) {
		this.currentUser = currentUser;
		this.friends = friends;
		this.limiter = limiter;
	}

	@PostMapping("/invitations")
	public ResponseEntity<ApiResponse<InvitationCreated>> create() {
		UUID userId = currentUser.requireUserId();
		limiter.check("friend-invitation-create", userId, 10);
		return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(friends.createInvitation(userId)));
	}

	@GetMapping("/invitations/{code}")
	public ResponseEntity<ApiResponse<InvitationPreview>> preview(@PathVariable String code) {
		UUID userId = currentUser.requireUserId();
		limiter.check("friend-invitation-preview", userId, 30);
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(friends.preview(userId, code)));
	}

	@PostMapping("/invitations/{code}/accept")
	public ResponseEntity<ApiResponse<Friend>> accept(@PathVariable String code) {
		UUID userId = currentUser.requireUserId();
		limiter.check("friend-invitation-accept", userId, 30);
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(friends.accept(userId, code)));
	}

	@GetMapping
	public ResponseEntity<ApiResponse<FriendList>> list(@Valid @ModelAttribute FriendPageRequest page) {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(friends.findFriends(currentUser.requireUserId(), page)));
	}
}
