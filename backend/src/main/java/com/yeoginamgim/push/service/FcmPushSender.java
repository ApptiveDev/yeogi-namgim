package com.yeoginamgim.push.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class FcmPushSender implements PushSender {
	private static final String SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
	private static final String MESSAGE = "주변에 확인할 수 있는 쪽지가 있어요.";
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
	private final ObjectMapper mapper;
	private final String projectId;
	private final String clientEmail;
	private final String privateKey;
	private String accessToken;
	private Instant tokenExpiresAt = Instant.EPOCH;

	public FcmPushSender(ObjectMapper mapper,
		@Value("${push.fcm.project-id:}") String projectId,
		@Value("${push.fcm.client-email:}") String clientEmail,
		@Value("${push.fcm.private-key:}") String privateKey) {
		this.mapper = mapper;
		this.projectId = projectId;
		this.clientEmail = clientEmail;
		this.privateKey = privateKey;
	}

	@Override
	public boolean isConfigured() {
		return !projectId.isBlank() && !clientEmail.isBlank() && !privateKey.isBlank();
	}

	@Override
	public DeliveryResult send(String deviceToken) {
		if (!isConfigured()) return DeliveryResult.RETRY;
		try {
			String payload = mapper.writeValueAsString(Map.of("message", Map.of(
				"token", deviceToken,
				"notification", Map.of("body", MESSAGE),
				"data", Map.of("screen", "home")
			)));
			HttpRequest request = HttpRequest.newBuilder()
				.uri(URI.create("https://fcm.googleapis.com/v1/projects/" + projectId + "/messages:send"))
				.header("Authorization", "Bearer " + getAccessToken())
				.header("Content-Type", "application/json; charset=UTF-8")
				.timeout(Duration.ofSeconds(15))
				.POST(HttpRequest.BodyPublishers.ofString(payload))
				.build();
			HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() >= 200 && response.statusCode() < 300) return DeliveryResult.SENT;
			if (response.body().contains("UNREGISTERED")) return DeliveryResult.INVALID_TOKEN;
			return DeliveryResult.RETRY;
		} catch (Exception exception) {
			return DeliveryResult.RETRY;
		}
	}

	private synchronized String getAccessToken() throws Exception {
		if (Instant.now().isBefore(tokenExpiresAt.minusSeconds(60))) return accessToken;
		Instant now = Instant.now();
		String header = encode(mapper.writeValueAsBytes(Map.of("alg", "RS256", "typ", "JWT")));
		String claims = encode(mapper.writeValueAsBytes(Map.of(
			"iss", clientEmail,
			"scope", SCOPE,
			"aud", "https://oauth2.googleapis.com/token",
			"iat", now.getEpochSecond(),
			"exp", now.plusSeconds(3600).getEpochSecond()
		)));
		String unsigned = header + "." + claims;
		Signature signature = Signature.getInstance("SHA256withRSA");
		signature.initSign(parsePrivateKey());
		signature.update(unsigned.getBytes(StandardCharsets.US_ASCII));
		String assertion = unsigned + "." + encode(signature.sign());
		String body = "grant_type=" + URLEncoder.encode("urn:ietf:params:oauth:grant-type:jwt-bearer", StandardCharsets.UTF_8)
			+ "&assertion=" + URLEncoder.encode(assertion, StandardCharsets.UTF_8);
		HttpRequest request = HttpRequest.newBuilder()
			.uri(URI.create("https://oauth2.googleapis.com/token"))
			.header("Content-Type", "application/x-www-form-urlencoded")
			.timeout(Duration.ofSeconds(15))
			.POST(HttpRequest.BodyPublishers.ofString(body))
			.build();
		HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
		if (response.statusCode() != 200) throw new IllegalStateException("FCM authentication failed");
		JsonNode json = mapper.readTree(response.body());
		accessToken = json.path("access_token").asText();
		tokenExpiresAt = now.plusSeconds(json.path("expires_in").asLong(3600));
		return accessToken;
	}

	private PrivateKey parsePrivateKey() throws Exception {
		String pem = privateKey.replace("\\n", "\n")
			.replace("-----BEGIN PRIVATE KEY-----", "")
			.replace("-----END PRIVATE KEY-----", "")
			.replaceAll("\\s", "");
		return KeyFactory.getInstance("RSA").generatePrivate(
			new PKCS8EncodedKeySpec(Base64.getDecoder().decode(pem)));
	}

	private String encode(byte[] bytes) {
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}
}
