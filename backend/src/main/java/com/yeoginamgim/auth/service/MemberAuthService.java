package com.yeoginamgim.auth.service;

import java.time.Clock;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.auth.dto.AuthRequests.LoginRequest;
import com.yeoginamgim.auth.dto.AuthRequests.SignupRequest;
import com.yeoginamgim.auth.dto.AuthResponses.TokenPair;
import com.yeoginamgim.auth.dto.AuthResponses.Profile;
import com.yeoginamgim.auth.repository.EmailVerificationRepository;
import com.yeoginamgim.user.domain.Member;
import com.yeoginamgim.user.repository.MemberRepository;

@Service
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class MemberAuthService {
	private final MemberRepository members;
	private final EmailVerificationRepository verifications;
	private final VerificationCodec verificationCodec;
	private final PasswordEncoder passwords;
	private final MemberSessionService sessions;
	private final Clock clock;
	private final String dummyHash;

	public MemberAuthService(MemberRepository members, EmailVerificationRepository verifications,
		VerificationCodec verificationCodec, PasswordEncoder passwords, MemberSessionService sessions, Clock clock) {
		this.members = members;
		this.verifications = verifications;
		this.verificationCodec = verificationCodec;
		this.passwords = passwords;
		this.sessions = sessions;
		this.clock = clock;
		this.dummyHash = passwords.encode(UUID.randomUUID().toString());
	}

	@Transactional
	public Profile signup(SignupRequest request) {
		if (members.existsByEmail(request.email())) throw AuthException.duplicateEmail();
		var verification = verifications.lock(request.email()).orElseThrow(AuthException::invalidVerification);
		if (verification.verifiedUntil() == null || !clock.instant().isBefore(verification.verifiedUntil())
			|| !verificationCodec.matches(verification.tokenHash(),
				verificationCodec.tokenHash(request.email(), request.verificationToken()))) {
			throw AuthException.invalidVerification();
		}
		Member member = new Member(UUID.randomUUID(), request.email(), passwords.encode(request.password()),
			request.nickname(), clock.instant());
		try {
			members.saveAndFlush(member);
		} catch (DataIntegrityViolationException exception) {
			throw AuthException.duplicateEmail();
		}
		verifications.consume(request.email());
		return Profile.from(member);
	}

	@Transactional
	public TokenPair login(LoginRequest request) {
		var member = members.findByEmail(request.email());
		boolean matches = passwords.matches(request.password(), member.map(Member::getPasswordHash).orElse(dummyHash));
		if (member.isEmpty() || !matches) throw AuthException.unauthorized();
		return sessions.open(member.orElseThrow().getId());
	}

	@Transactional(readOnly = true)
	public Profile profile(UUID userId) {
		return Profile.from(members.findById(userId).orElseThrow(AuthException::unauthorized));
	}
}
