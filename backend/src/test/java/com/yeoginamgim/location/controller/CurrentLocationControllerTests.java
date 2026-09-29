package com.yeoginamgim.location.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.yeoginamgim.common.api.GlobalExceptionHandler;
import com.yeoginamgim.common.auth.BearerTokenExtractor;
import com.yeoginamgim.location.dto.CurrentLocationResponse;
import com.yeoginamgim.location.service.CurrentLocationService;

class CurrentLocationControllerTests {
	private final CurrentLocationService service = mock(CurrentLocationService.class);
	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new CurrentLocationController(service, new BearerTokenExtractor()))
			.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void updatesCurrentLocation() throws Exception {
		when(service.update(eq("guest-token"), any())).thenReturn(
			new CurrentLocationResponse(35.1797, 129.0755, Instant.parse("2026-09-29T13:00:00Z")));
		mvc.perform(patch("/api/v1/locations/current")
				.header("Authorization", "Bearer guest-token")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"latitude\":35.1797,\"longitude\":129.0755}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.latitude").value(35.1797));
	}

	@Test
	void rejectsInvalidCoordinates() throws Exception {
		mvc.perform(patch("/api/v1/locations/current")
				.header("Authorization", "Bearer guest-token")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"latitude\":91,\"longitude\":129.0755}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
	}
}
