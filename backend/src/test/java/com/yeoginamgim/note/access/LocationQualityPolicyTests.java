package com.yeoginamgim.note.access;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import com.yeoginamgim.note.service.InvalidNoteRequestException;

class LocationQualityPolicyTests {
	private final Instant now = Instant.parse("2026-11-02T00:00:00Z");
	private final LocationQualityPolicy policy = new LocationQualityPolicy(50, Duration.ofSeconds(30),
		Duration.ofSeconds(10), Clock.fixed(now, ZoneOffset.UTC));

	@Test
	void acceptsInclusiveBoundariesAndMissingLocation() {
		assertThatCode(() -> policy.requireValid(null)).doesNotThrowAnyException();
		assertThatCode(() -> policy.requireValid(new LocationInput(35, 129, 50.0, now.minusSeconds(30))))
			.doesNotThrowAnyException();
		assertThatCode(() -> policy.requireValid(new LocationInput(35, 129, 0.0, now.plusSeconds(10))))
			.doesNotThrowAnyException();
	}

	@Test
	void rejectsMissingInaccurateStaleAndFutureMeasurements() {
		for (LocationInput input : new LocationInput[] {
			new LocationInput(35, 129, null, now), new LocationInput(35, 129, 10.0, null),
			new LocationInput(35, 129, 50.001, now),
			new LocationInput(35, 129, 10.0, now.minusSeconds(30).minusNanos(1)),
			new LocationInput(35, 129, 10.0, now.plusSeconds(10).plusNanos(1))
		}) {
			assertThatThrownBy(() -> policy.requireValid(input)).isInstanceOf(InvalidNoteRequestException.class);
		}
	}
}
