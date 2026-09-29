package com.yeoginamgim.common.rate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.stereotype.Component;

@Component
public class FixedWindowRateLimiter {
	private record Key(String scope, UUID guestId) { }
	private record Window(Instant startsAt, int count) { }

	private final ConcurrentHashMap<Key, Window> windows = new ConcurrentHashMap<>();
	private final AtomicInteger checks = new AtomicInteger();

	public void check(String scope, UUID guestId, int maxPerMinute) {
		Instant now = Instant.now();
		windows.compute(new Key(scope, guestId), (key, previous) -> {
			if (previous == null || !now.isBefore(previous.startsAt().plus(1, ChronoUnit.MINUTES))) {
				return new Window(now, 1);
			}
			if (previous.count() >= maxPerMinute) throw new RateLimitExceededException();
			return new Window(previous.startsAt(), previous.count() + 1);
		});
		if (checks.incrementAndGet() % 1000 == 0) {
			windows.forEach((key, window) -> {
				if (!now.isBefore(window.startsAt().plus(1, ChronoUnit.MINUTES))) {
					windows.remove(key, window);
				}
			});
		}
	}
}
