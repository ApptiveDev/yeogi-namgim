package com.yeoginamgim.friend.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("friends")
public record FriendProperties(Duration invitationTtl) {
	public FriendProperties {
		if (invitationTtl == null || invitationTtl.compareTo(Duration.ofMinutes(1)) < 0
			|| invitationTtl.compareTo(Duration.ofDays(7)) > 0) {
			throw new IllegalArgumentException("FRIEND_INVITATION_TTL은 1분 이상 7일 이하여야 합니다.");
		}
	}
}
