package com.yeoginamgim.common.rate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import org.junit.jupiter.api.Test;

class FixedWindowRateLimiterTests {
	@Test
	void limitsEachGuestAndScopeSeparately() {
		FixedWindowRateLimiter limiter = new FixedWindowRateLimiter();
		UUID guest = UUID.randomUUID();
		limiter.check("notes", guest, 2);
		limiter.check("notes", guest, 2);
		assertThatThrownBy(() -> limiter.check("notes", guest, 2))
			.isInstanceOf(RateLimitExceededException.class);
		limiter.check("push", guest, 2);
		limiter.check("notes", UUID.randomUUID(), 2);
	}
}
