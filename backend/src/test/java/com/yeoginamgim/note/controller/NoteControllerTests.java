package com.yeoginamgim.note.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
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
import com.yeoginamgim.note.dto.NoteMarkerResponse;
import com.yeoginamgim.note.dto.NoteMarkersResponse;
import com.yeoginamgim.note.dto.NoteOpenResponse;
import com.yeoginamgim.note.service.NoteService;

class NoteControllerTests {
	@Test
	void opensNoteWithValidCoordinates() throws Exception {
		UUID noteId = UUID.randomUUID();
		when(noteService.open(eq("guest-token"), eq(noteId), any()))
			.thenReturn(new NoteOpenResponse(noteId, "내용", false, Instant.parse("2026-09-29T01:30:00Z")));
		mockMvc.perform(post("/api/v1/notes/{noteId}/open", noteId)
				.header("Authorization", "Bearer guest-token")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"latitude\":35.1797,\"longitude\":129.0755}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.data.content").value("내용"));
	}

	@Test
	void rejectsMalformedNoteIdAndCoordinates() throws Exception {
		mockMvc.perform(post("/api/v1/notes/not-a-uuid/open")
				.header("Authorization", "Bearer guest-token")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"latitude\":35.0,\"longitude\":129.0}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		mockMvc.perform(post("/api/v1/notes/{noteId}/open", UUID.randomUUID())
				.header("Authorization", "Bearer guest-token")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"latitude\":91.0,\"longitude\":129.0}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
	}
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

	@Test
	void returnsMarkersInsideMapBoundsWithoutContent() throws Exception {
		UUID noteId = UUID.randomUUID();
		when(noteService.findMarkers(eq("guest-token"), any()))
			.thenReturn(new NoteMarkersResponse(List.of(
				new NoteMarkerResponse(noteId, 35.1796, 129.0756, true)
			)));

		mockMvc.perform(get("/api/v1/notes")
				.header("Authorization", "Bearer guest-token")
				.param("minLatitude", "35.17")
				.param("minLongitude", "129.06")
				.param("maxLatitude", "35.19")
				.param("maxLongitude", "129.09"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.success").value(true))
			.andExpect(jsonPath("$.data.notes[0].noteId").value(noteId.toString()))
			.andExpect(jsonPath("$.data.notes[0].latitude").value(35.1796))
			.andExpect(jsonPath("$.data.notes[0].longitude").value(129.0756))
			.andExpect(jsonPath("$.data.notes[0].isMine").value(true))
			.andExpect(jsonPath("$.data.notes[0].content").doesNotExist());
	}

	@Test
	void rejectsInvalidMapBounds() throws Exception {
		mockMvc.perform(get("/api/v1/notes")
				.header("Authorization", "Bearer guest-token")
				.param("minLatitude", "35.19")
				.param("minLongitude", "129.09")
				.param("maxLatitude", "35.17")
				.param("maxLongitude", "129.06"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.success").value(false))
			.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		verifyNoInteractions(noteService);
	}
}
