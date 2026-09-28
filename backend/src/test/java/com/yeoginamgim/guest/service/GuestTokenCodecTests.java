package com.yeoginamgim.guest.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GuestTokenCodecTests {
	private final GuestTokenCodec guestTokenCodec = new GuestTokenCodec();

	@Test
	void issuesDifferentUrlSafeTokens() {
		String firstToken = guestTokenCodec.issueToken();
		String secondToken = guestTokenCodec.issueToken();

		assertThat(firstToken).hasSize(43).doesNotContain("=", "+", "/");
		assertThat(secondToken).isNotEqualTo(firstToken);
	}

	@Test
	void hashesTokenWithSha256() {
		String tokenHash = guestTokenCodec.hash("guest-token");

		assertThat(tokenHash)
			.hasSize(64)
			.matches("[0-9a-f]{64}")
			.isEqualTo(guestTokenCodec.hash("guest-token"));
	}
}

