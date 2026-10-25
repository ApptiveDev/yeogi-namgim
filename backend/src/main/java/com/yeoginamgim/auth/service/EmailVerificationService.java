package com.yeoginamgim.auth.service;

import java.time.Clock;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.auth.dto.AuthResponses.EmailConfirmed;
import com.yeoginamgim.auth.dto.AuthResponses.VerificationRequested;
import com.yeoginamgim.auth.repository.EmailVerificationRepository;
import com.yeoginamgim.common.rate.RateLimitExceededException;

@Service
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class EmailVerificationService {
	private final EmailVerificationRepository verifications;
	private final VerificationCodec codec;
	private final VerificationMailSender mail;
	private final Clock clock;

	public EmailVerificationService(EmailVerificationRepository verifications, VerificationCodec codec,
		VerificationMailSender mail, Clock clock) {
		this.verifications = verifications;
		this.codec = codec;
		this.mail = mail;
		this.clock = clock;
	}

	@Transactional
	public VerificationRequested request(String email) {
		UUID id = UUID.randomUUID();
		String code = codec.newCode();
		if (!verifications.reserve(email, id, codec.codeHash(email, id, code), clock.instant())) {
			throw new RateLimitExceededException();
		}
		mail.sendCode(email, code);
		return new VerificationRequested(id, 300);
	}

	// Wrong attempts must be committed even though the API returns a validation error.
	@Transactional(noRollbackFor = AuthException.class)
	public EmailConfirmed confirm(String email, UUID verificationId, String code) {
		var verification = verifications.lock(email).orElseThrow(AuthException::invalidVerification);
		if (!verification.id().equals(verificationId) || !clock.instant().isBefore(verification.expiresAt()) || verification.attempts() >= 5
			|| verification.verifiedUntil() != null) {
			throw AuthException.invalidVerification();
		}
		if (!codec.matches(verification.codeHash(), codec.codeHash(email, verification.id(), code))) {
			verifications.fail(email);
			throw AuthException.invalidVerification();
		}
		String token = codec.newToken();
		verifications.confirm(email, codec.tokenHash(email, token), clock.instant().plusSeconds(600));
		return new EmailConfirmed(token, 600);
	}
}
