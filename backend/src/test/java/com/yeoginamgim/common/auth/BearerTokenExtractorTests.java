package com.yeoginamgim.common.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.yeoginamgim.guest.service.InvalidGuestTokenException;

class BearerTokenExtractorTests {
	private final BearerTokenExtractor extractor = new BearerTokenExtractor();

	@Test
	void extractsBearerToken() {
		assertThat(extractor.extract("Bearer guest-token")).isEqualTo("guest-token");
	}

	@Test
	void rejectsMissingOrMalformedHeader() {
		assertThatThrownBy(() -> extractor.extract(null))
			.isInstanceOf(InvalidGuestTokenException.class);
		assertThatThrownBy(() -> extractor.extract("guest-token"))
			.isInstanceOf(InvalidGuestTokenException.class);
		assertThatThrownBy(() -> extractor.extract("Bearer "))
			.isInstanceOf(InvalidGuestTokenException.class);
	}
}
