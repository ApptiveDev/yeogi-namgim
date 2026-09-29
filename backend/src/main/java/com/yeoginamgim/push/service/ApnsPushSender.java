package com.yeoginamgim.push.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

@Component
public class ApnsPushSender implements PushSender {
	private static final String MESSAGE = "주변에 확인할 수 있는 쪽지가 있어요.";
	private final HttpClient http = HttpClient.newBuilder()
		.version(HttpClient.Version.HTTP_2).connectTimeout(Duration.ofSeconds(10)).build();
	private final ObjectMapper mapper;
	private final String teamId;
	private final String keyId;
	private final String bundleId;
	private final String privateKey;
	private final boolean sandbox;
	private String providerToken;
	private Instant tokenCreatedAt = Instant.EPOCH;

	public ApnsPushSender(ObjectMapper mapper,
		@Value("${push.apns.team-id:}") String teamId,
		@Value("${push.apns.key-id:}") String keyId,
		@Value("${push.apns.bundle-id:}") String bundleId,
		@Value("${push.apns.private-key:}") String privateKey,
		@Value("${push.apns.sandbox:false}") boolean sandbox) {
		this.mapper = mapper;
		this.teamId = teamId;
		this.keyId = keyId;
		this.bundleId = bundleId;
		this.privateKey = privateKey;
		this.sandbox = sandbox;
	}

	@Override
	public boolean isConfigured() {
		return !teamId.isBlank() && !keyId.isBlank() && !bundleId.isBlank() && !privateKey.isBlank();
	}

	@Override
	public DeliveryResult send(String deviceToken) {
		if (!isConfigured()) return DeliveryResult.RETRY;
		try {
			String host = sandbox ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
			String payload = mapper.writeValueAsString(Map.of(
				"aps", Map.of("alert", MESSAGE, "sound", "default"), "screen", "home"));
			HttpRequest request = HttpRequest.newBuilder()
				.uri(URI.create(host + "/3/device/" + deviceToken))
				.header("authorization", "bearer " + getProviderToken())
				.header("apns-topic", bundleId)
				.header("apns-push-type", "alert")
				.header("content-type", "application/json")
				.timeout(Duration.ofSeconds(15))
				.POST(HttpRequest.BodyPublishers.ofString(payload))
				.build();
			HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() == 200) return DeliveryResult.SENT;
			if (response.statusCode() == 410 || response.body().contains("BadDeviceToken")
				|| response.body().contains("Unregistered")) return DeliveryResult.INVALID_TOKEN;
			return DeliveryResult.RETRY;
		} catch (Exception exception) {
			return DeliveryResult.RETRY;
		}
	}

	private synchronized String getProviderToken() throws Exception {
		if (Instant.now().isBefore(tokenCreatedAt.plus(Duration.ofMinutes(50)))) return providerToken;
		Instant now = Instant.now();
		String header = encode(mapper.writeValueAsBytes(Map.of("alg", "ES256", "kid", keyId)));
		String claims = encode(mapper.writeValueAsBytes(Map.of("iss", teamId, "iat", now.getEpochSecond())));
		String unsigned = header + "." + claims;
		String pem = privateKey.replace("\\n", "\n")
			.replace("-----BEGIN PRIVATE KEY-----", "")
			.replace("-----END PRIVATE KEY-----", "")
			.replaceAll("\\s", "");
		Signature signature = Signature.getInstance("SHA256withECDSAinP1363Format");
		signature.initSign(KeyFactory.getInstance("EC").generatePrivate(
			new PKCS8EncodedKeySpec(Base64.getDecoder().decode(pem))));
		signature.update(unsigned.getBytes(StandardCharsets.US_ASCII));
		providerToken = unsigned + "." + encode(signature.sign());
		tokenCreatedAt = now;
		return providerToken;
	}

	private String encode(byte[] bytes) {
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}
}
