package com.yeoginamgim.push.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.yeoginamgim.push.domain.PushPlatform;
import com.yeoginamgim.push.repository.PushCandidate;
import com.yeoginamgim.push.repository.PushDeliveryRepository;

class HourlyPushJobTests {
	private final PushDeliveryRepository repository = mock(PushDeliveryRepository.class);
	private final FcmPushSender fcmSender = mock(FcmPushSender.class);
	private final ApnsPushSender apnsSender = mock(ApnsPushSender.class);
	private final HourlyPushJob job = new HourlyPushJob(repository, fcmSender, apnsSender);

	@Test
	void sendsFcmOnceForClaimedAndroidCandidate() {
		PushCandidate candidate = new PushCandidate(UUID.randomUUID(), PushPlatform.ANDROID, "fcm-device-token", "wydm6e");
		when(repository.findCandidates(any(), any())).thenReturn(List.of(candidate));
		when(fcmSender.isConfigured()).thenReturn(true);
		when(repository.claim(eq(candidate.tokenId()), eq(candidate.regionKey()), any())).thenReturn(true);
		when(fcmSender.send(candidate.deviceToken())).thenReturn(DeliveryResult.SENT);
		job.run();
		verify(fcmSender).send("fcm-device-token");
	}

	@Test
	void releasesClaimAfterTemporaryProviderFailure() {
		PushCandidate candidate = new PushCandidate(UUID.randomUUID(), PushPlatform.IOS,
			"a".repeat(64), "wydm6e");
		when(repository.findCandidates(any(), any())).thenReturn(List.of(candidate));
		when(apnsSender.isConfigured()).thenReturn(true);
		when(repository.claim(eq(candidate.tokenId()), eq(candidate.regionKey()), any())).thenReturn(true);
		when(apnsSender.send(candidate.deviceToken())).thenReturn(DeliveryResult.RETRY);
		job.run();
		verify(repository).release(eq(candidate.tokenId()), eq(candidate.regionKey()), any());
	}
}
