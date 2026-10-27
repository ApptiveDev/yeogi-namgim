package com.yeoginamgim.friend.service;

import java.util.Set;
import java.util.UUID;

/** Internal read contract shared with map/opening services. */
public interface FriendshipQueryService {
	Set<UUID> findFriendIds(UUID userId, Set<UUID> candidateUserIds);
	long countFriends(UUID userId);
}
