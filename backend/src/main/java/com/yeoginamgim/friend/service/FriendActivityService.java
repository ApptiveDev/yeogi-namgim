package com.yeoginamgim.friend.service;

import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.yeoginamgim.friend.dto.FriendActivityResponse;
import com.yeoginamgim.friend.dto.FriendPageRequest;
import com.yeoginamgim.friend.repository.FriendActivityRepository;

@Service
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class FriendActivityService {
	private final FriendActivityRepository activities;

	public FriendActivityService(FriendActivityRepository activities) { this.activities = activities; }

	@Transactional(readOnly = true)
	public FriendActivityResponse find(UUID userId, FriendPageRequest page) {
		var found = activities.find(userId, page.size() + 1, page.page() * page.size());
		return new FriendActivityResponse(found.stream().limit(page.size()).toList(),
			page.page(), page.size(), found.size() > page.size());
	}
}
