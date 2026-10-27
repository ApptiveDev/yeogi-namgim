package com.yeoginamgim.friend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.yeoginamgim.friend.config.FriendProperties;
import com.yeoginamgim.friend.repository.FriendInvitationRepository;
import com.yeoginamgim.friend.repository.FriendshipRepository;
import com.yeoginamgim.friend.service.FriendException;
import com.yeoginamgim.friend.service.FriendInvitationCodeCodec;
import com.yeoginamgim.friend.service.FriendService;

class FriendServiceTests {
	@Test
	void invitationIsInvalidExactlyAtExpiryWithoutCreatingFriendship() {
		var invitations = mock(FriendInvitationRepository.class);
		var relationships = mock(FriendshipRepository.class);
		var codes = new FriendInvitationCodeCodec();
		Instant now = Instant.parse("2026-10-27T00:00:00Z");
		UUID inviterId = UUID.randomUUID();
		var service = new FriendService(invitations, relationships, codes, new FriendProperties(Duration.ofHours(1)),
			Clock.fixed(now, ZoneOffset.UTC));
		String code = codes.issue();
		when(invitations.find(codes.hash(code), true)).thenReturn(Optional.of(
			new FriendInvitationRepository.Invitation(UUID.randomUUID(), inviterId, "친구", now, null)));
		assertThatThrownBy(() -> service.accept(UUID.randomUUID(), code)).isInstanceOf(FriendException.class)
			.satisfies(error -> assertThat(((FriendException)error).getCode()).isEqualTo("FRIEND_INVITATION_INVALID"));
		verifyNoInteractions(relationships);
	}

	@Test
	void invitationDurationCanBeConfiguredAndRejectsInvalidBounds() {
		assertThat(new FriendProperties(Duration.ofMinutes(1)).invitationTtl()).isEqualTo(Duration.ofMinutes(1));
		assertThat(new FriendProperties(Duration.ofDays(7)).invitationTtl()).isEqualTo(Duration.ofDays(7));
		for (Duration ttl : new Duration[] {null, Duration.ZERO, Duration.ofSeconds(59), Duration.ofDays(8)}) {
			assertThatThrownBy(() -> new FriendProperties(ttl)).isInstanceOf(IllegalArgumentException.class);
		}
	}
}
