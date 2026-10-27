package com.yeoginamgim.friend.service;

import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.friend.repository.FriendshipRepository;

@Service
@Transactional(readOnly = true)
public class DatabaseFriendshipQueryService implements FriendshipQueryService {
	private final FriendshipRepository friendships;

	public DatabaseFriendshipQueryService(FriendshipRepository friendships) { this.friendships = friendships; }

	@Override
	public Set<UUID> findFriendIds(UUID userId, Set<UUID> candidateUserIds) {
		return friendships.findFriendIds(userId, candidateUserIds);
	}

	@Override
	public long countFriends(UUID userId) { return friendships.count(userId); }
}
