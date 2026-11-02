package com.yeoginamgim.note.access;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.yeoginamgim.note.service.InvalidNoteRequestException;

@Component
public class LocationQualityPolicy {
	private final double maxAccuracyMeters;
	private final Duration maxAge;
	private final Duration futureTolerance;
	private final Clock clock;

	@Autowired
	public LocationQualityPolicy(@Value("${note.location.max-accuracy-meters:50}") double maxAccuracyMeters,
		@Value("${note.location.max-age-seconds:30}") long maxAgeSeconds,
		@Value("${note.location.future-tolerance-seconds:10}") long futureToleranceSeconds) {
		this(maxAccuracyMeters, Duration.ofSeconds(maxAgeSeconds), Duration.ofSeconds(futureToleranceSeconds), Clock.systemUTC());
	}

	LocationQualityPolicy(double maxAccuracyMeters, Duration maxAge, Duration futureTolerance, Clock clock) {
		if (!Double.isFinite(maxAccuracyMeters) || maxAccuracyMeters < 0 || maxAge.isNegative()
			|| futureTolerance.isNegative()) throw new IllegalArgumentException("Invalid location quality configuration");
		this.maxAccuracyMeters = maxAccuracyMeters;
		this.maxAge = maxAge;
		this.futureTolerance = futureTolerance;
		this.clock = clock;
	}

	public void requireValid(LocationInput location) {
		if (location == null) return;
		Double accuracy = location.accuracyMeters();
		Instant measuredAt = location.measuredAt();
		Instant now = clock.instant();
		if (!Double.isFinite(location.latitude()) || location.latitude() < -90 || location.latitude() > 90
			|| !Double.isFinite(location.longitude()) || location.longitude() < -180 || location.longitude() > 180
			|| accuracy == null || !Double.isFinite(accuracy) || accuracy < 0 || accuracy > maxAccuracyMeters
			|| measuredAt == null || measuredAt.isBefore(now.minus(maxAge))
			|| measuredAt.isAfter(now.plus(futureTolerance))) {
			throw new InvalidNoteRequestException("현재 위치의 정확도 또는 측정 시각을 확인해 다시 요청해 주세요.");
		}
	}
}
