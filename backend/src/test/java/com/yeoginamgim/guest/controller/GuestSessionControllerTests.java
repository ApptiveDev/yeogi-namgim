package com.yeoginamgim.guest.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.yeoginamgim.guest.dto.GuestSessionCreateResponse;
import com.yeoginamgim.guest.service.GuestSessionService;

class GuestSessionControllerTests {
	@Test
	void createsGuestSessionWithoutAuthentication() throws Exception {
		GuestSessionService service = mock(GuestSessionService.class);
		UUID guestId = UUID.randomUUID();
		when(service.create())
			.thenReturn(new GuestSessionCreateResponse(guestId, "guest-token", "Bearer"));
		MockMvc mockMvc = MockMvcBuilders
			.standaloneSetup(new GuestSessionController(service))
			.build();

		mockMvc.perform(post("/api/v1/guest-sessions"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.guestId").value(guestId.toString()))
			.andExpect(jsonPath("$.data.guestToken").value("guest-token"))
			.andExpect(jsonPath("$.data.tokenType").value("Bearer"))
			.andExpect(jsonPath("$.meta.requestId").isNotEmpty())
			.andExpect(jsonPath("$.meta.timestamp").isNotEmpty());
	}
}
