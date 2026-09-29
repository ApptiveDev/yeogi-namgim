package com.yeoginamgim.push.service;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.yeoginamgim.push.domain.PushPlatform;
import com.yeoginamgim.push.repository.PushCandidate;
import com.yeoginamgim.push.repository.PushDeliveryRepository;

@Component
@ConditionalOnProperty(name = "push.enabled", havingValue = "true")
public class HourlyPushJob {
	private static final Logger log = LoggerFactory.getLogger(HourlyPushJob.class);
	private final PushDeliveryRepository repository;
	private final FcmPushSender fcmSender;
	private final ApnsPushSender apnsSender;

	public HourlyPushJob(PushDeliveryRepository repository, FcmPushSender fcmSender, ApnsPushSender apnsSender) {
		this.repository = repository;
		this.fcmSender = fcmSender;
		this.apnsSender = apnsSender;
	}

	@Scheduled(cron = "0 0 * * * *", zone = "UTC")
	public void run() {
		Instant now = Instant.now();
		Instant hour = now.truncatedTo(ChronoUnit.HOURS);
		repository.purgeBefore(now.minus(30, ChronoUnit.DAYS));
		UUID after = new UUID(0L, 0L);
		List<PushCandidate> batch;
		do {
			batch = repository.findCandidates(now.minus(Duration.ofHours(24)), after);
			for (PushCandidate candidate : batch) {
				deliver(candidate, hour);
			}
			if (!batch.isEmpty()) after = batch.getLast().tokenId();
		} while (batch.size() == 200);
	}

	private void deliver(PushCandidate candidate, Instant hour) {
		PushSender sender = candidate.platform() == PushPlatform.IOS
			&& candidate.deviceToken().matches("(?i)[0-9a-f]{64,}") ? apnsSender : fcmSender;
		if (!sender.isConfigured() || !repository.claim(candidate.tokenId(), candidate.regionKey(), hour)) return;
		try {
			DeliveryResult result = sender.send(candidate.deviceToken());
			if (result == DeliveryResult.RETRY) repository.release(candidate.tokenId(), candidate.regionKey(), hour);
			if (result == DeliveryResult.INVALID_TOKEN) repository.disable(candidate.tokenId());
		} catch (Exception exception) {
			repository.release(candidate.tokenId(), candidate.regionKey(), hour);
			log.warn("Push delivery failed for token id {}", candidate.tokenId(), exception);
		}
	}
}
