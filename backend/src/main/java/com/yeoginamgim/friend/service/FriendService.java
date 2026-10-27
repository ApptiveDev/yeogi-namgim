package com.yeoginamgim.friend.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.friend.config.FriendProperties;
import com.yeoginamgim.friend.dto.FriendPageRequest;
import com.yeoginamgim.friend.dto.FriendResponses.Friend;
import com.yeoginamgim.friend.dto.FriendResponses.FriendList;
import com.yeoginamgim.friend.dto.FriendResponses.InvitationCreated;
import com.yeoginamgim.friend.dto.FriendResponses.InvitationPreview;
import com.yeoginamgim.friend.repository.FriendInvitationRepository;
import com.yeoginamgim.friend.repository.FriendshipRepository;

@Service
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class FriendService {
	private final FriendInvitationRepository invitations;
	private final FriendshipRepository friendships;
	private final FriendInvitationCodeCodec codes;
	private final FriendProperties properties;
	private final Clock clock;

	public FriendService(FriendInvitationRepository invitations, FriendshipRepository friendships,
		FriendInvitationCodeCodec codes, FriendProperties properties, Clock clock) {
		this.invitations = invitations;
		this.friendships = friendships;
		this.codes = codes;
		this.properties = properties;
		this.clock = clock;
	}

	@Transactional
	public InvitationCreated createInvitation(UUID userId) {
		String code = codes.issue();
		Instant now = clock.instant();
		Instant expiresAt = now.plus(properties.invitationTtl());
		invitations.create(UUID.randomUUID(), userId, codes.hash(code), now, expiresAt);
		return new InvitationCreated(code, expiresAt);
	}

	@Transactional(readOnly = true)
	public InvitationPreview preview(UUID userId, String code) {
		var invitation = invitations.find(codes.hash(code), false).orElseThrow(FriendException::invalidInvitation);
		validateInvitation(userId, invitation, clock.instant());
		if (!friendships.findFriendIds(userId, java.util.Set.of(invitation.inviterId())).isEmpty()) {
			throw FriendException.alreadyFriends();
		}
		return new InvitationPreview(invitation.nickname(), invitation.expiresAt());
	}

	@Transactional
	public Friend accept(UUID userId, String code) {
		var invitation = invitations.find(codes.hash(code), true).orElseThrow(FriendException::invalidInvitation);
		Instant now = clock.instant();
		validateInvitation(userId, invitation, now);
		if (!friendships.create(invitation.inviterId(), userId, now)) throw FriendException.alreadyFriends();
		invitations.accept(invitation.id(), userId, now);
		return new Friend(invitation.inviterId(), invitation.nickname(), now);
	}

	@Transactional(readOnly = true)
	public FriendList findFriends(UUID userId, FriendPageRequest page) {
		var friends = friendships.findFriends(userId, page.size() + 1, page.page() * page.size());
		boolean hasNext = friends.size() > page.size();
		return new FriendList(friends.stream().limit(page.size()).toList(), page.page(), page.size(), hasNext);
	}

	private void validateInvitation(UUID userId, FriendInvitationRepository.Invitation invitation, Instant now) {
		if (invitation.acceptedBy() != null || !now.isBefore(invitation.expiresAt())) {
			throw FriendException.invalidInvitation();
		}
		if (invitation.inviterId().equals(userId)) throw FriendException.selfInvitation();
	}
}
