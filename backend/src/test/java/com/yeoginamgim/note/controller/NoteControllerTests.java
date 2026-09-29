package com.yeoginamgim.note.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
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
import com.yeoginamgim.note.dto.NoteCreateRequest;
import com.yeoginamgim.note.dto.NoteCreateResponse;
import com.yeoginamgim.note.service.NoteService;

class NoteControllerTests {
	private final NoteService noteService = mock(NoteService.class);
	private MockMvc mockMvc;

	@BeforeEach
	void setUp() {
		mockMvc = MockMvcBuilders
			.standaloneSetup(new NoteController(noteService, new BearerTokenExtractor()))
			.setControllerAdvice(new GlobalExceptionHandler())
			.build();
	}

	@Test
	void createsNoteWithGuestBearerToken() throws Exception {
		UUID noteId = UUID.randomUUID();
		Instant createdAt = Instant.parse("2026-09-29T01:30:00Z");
		when(noteService.create(eq("guest-token"), any(NoteCreateRequest.class)))
			.thenReturn(new NoteCreateResponse(noteId, createdAt));

		mockMvc.perform(post("/api/v1/notes")
				.header("Authorization", "Bearer guest-token")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{
					  "content": "여기 남긴 쪽지",
					  "latitude": 35.1796,
					  "longitude": 129.0756
					}
					"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.noteId").value(noteId.toString()))
			.andExpect(jsonPath("$.data.createdAt").value("2026-09-29T01:30:00Z"));
	}

	@Test
	void rejectsRequestWithoutGuestToken() throws Exception {
		mockMvc.perform(post("/api/v1/notes")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"content":"쪽지","latitude":35.1796,"longitude":129.0756}
					"""))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
		verifyNoInteractions(noteService);
	}

	@Test
	void rejectsBlankContentAndOutOfRangeCoordinates() throws Exception {
		mockMvc.perform(post("/api/v1/notes")
				.header("Authorization", "Bearer guest-token")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"content":"   ","latitude":91.0,"longitude":181.0}
					"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		verifyNoInteractions(noteService);
	}
}
