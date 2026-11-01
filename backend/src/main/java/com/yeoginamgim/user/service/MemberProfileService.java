package com.yeoginamgim.user.service;

import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.yeoginamgim.auth.dto.AuthResponses.Profile;
import com.yeoginamgim.auth.service.AuthException;
import com.yeoginamgim.user.dto.ProfileUpdateRequest;
import com.yeoginamgim.user.repository.MemberRepository;

@Service
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class MemberProfileService {
	private final MemberRepository members;

	public MemberProfileService(MemberRepository members) { this.members = members; }

	@Transactional
	public Profile update(UUID userId, ProfileUpdateRequest request) {
		if (members.updateNickname(userId, request.nickname()) != 1) throw AuthException.unauthorized();
		return Profile.from(members.findById(userId).orElseThrow(AuthException::unauthorized));
	}
}
