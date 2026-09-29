package com.yeoginamgim.push.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.yeoginamgim.common.api.GlobalExceptionHandler;
import com.yeoginamgim.common.auth.BearerTokenExtractor;
import com.yeoginamgim.push.domain.PushPlatform;
import com.yeoginamgim.push.dto.PushTokenRegisterResponse;
import com.yeoginamgim.push.service.PushTokenService;

class PushTokenControllerTests {
	private final PushTokenService service = mock(PushTokenService.class);
	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new PushTokenController(service, new BearerTokenExtractor()))
			.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void registersToken() throws Exception {
		UUID id = UUID.randomUUID();
		when(service.register(eq("guest-token"), any())).thenReturn(
			new PushTokenRegisterResponse(id, PushPlatform.ANDROID, Instant.parse("2026-09-29T01:30:00Z")));
		mvc.perform(post("/api/v1/push-tokens")
				.header("Authorization", "Bearer guest-token")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"platform\":\"ANDROID\",\"pushToken\":\"device-token-123\"}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.data.pushTokenId").value(id.toString()))
			.andExpect(jsonPath("$.data.platform").value("ANDROID"));
	}

	@Test
	void rejectsInvalidPlatformAndMissingAuth() throws Exception {
		mvc.perform(post("/api/v1/push-tokens")
				.header("Authorization", "Bearer guest-token")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"platform\":\"WEB\",\"pushToken\":\"device-token-123\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		mvc.perform(post("/api/v1/push-tokens")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"platform\":\"ANDROID\",\"pushToken\":\"device-token-123\"}"))
			.andExpect(status().isUnauthorized());
	}
}
