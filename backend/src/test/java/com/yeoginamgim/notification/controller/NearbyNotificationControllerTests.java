package com.yeoginamgim.notification.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.yeoginamgim.common.api.GlobalExceptionHandler;
import com.yeoginamgim.common.auth.BearerTokenExtractor;
import com.yeoginamgim.notification.dto.NearbyNotificationResponse;
import com.yeoginamgim.notification.service.NearbyNotificationService;

class NearbyNotificationControllerTests {
	private final NearbyNotificationService service = mock(NearbyNotificationService.class);
	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(
			new NearbyNotificationController(service, new BearerTokenExtractor()))
			.setControllerAdvice(new GlobalExceptionHandler())
			.build();
	}

	@Test
	void returnsNearbyPresenceWithoutNoteData() throws Exception {
		when(service.check(eq("guest-token"), any()))
			.thenReturn(new NearbyNotificationResponse(true));

		mvc.perform(get("/api/v1/notifications/nearby")
				.header("Authorization", "Bearer guest-token")
				.param("latitude", "35.1797")
				.param("longitude", "129.0755"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.hasNearbyNotes").value(true))
			.andExpect(jsonPath("$.data.notes").doesNotExist())
			.andExpect(jsonPath("$.data.content").doesNotExist());
	}

	@Test
	void rejectsMissingTokenAndInvalidCoordinates() throws Exception {
		mvc.perform(get("/api/v1/notifications/nearby")
				.param("latitude", "35.1797")
				.param("longitude", "129.0755"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
		mvc.perform(get("/api/v1/notifications/nearby")
				.header("Authorization", "Bearer guest-token")
				.param("latitude", "91")
				.param("longitude", "129.0755"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		mvc.perform(get("/api/v1/notifications/nearby")
				.header("Authorization", "Bearer guest-token")
				.param("latitude", "not-a-number")
				.param("longitude", "129.0755"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		verifyNoInteractions(service);
	}
}
