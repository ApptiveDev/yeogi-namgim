package com.yeoginamgim.note.controller;

import static org.springframework.http.HttpStatus.CREATED;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.BearerTokenExtractor;
import com.yeoginamgim.note.dto.NoteCreateRequest;
import com.yeoginamgim.note.dto.NoteCreateResponse;
import com.yeoginamgim.note.service.NoteService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/notes")
public class NoteController {
	private final NoteService noteService;
	private final BearerTokenExtractor bearerTokenExtractor;

	public NoteController(NoteService noteService, BearerTokenExtractor bearerTokenExtractor) {
		this.noteService = noteService;
		this.bearerTokenExtractor = bearerTokenExtractor;
	}

	@PostMapping
	public ResponseEntity<ApiResponse<NoteCreateResponse>> create(
		@RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
		@Valid @RequestBody NoteCreateRequest request
	) {
		String guestToken = bearerTokenExtractor.extract(authorizationHeader);
		NoteCreateResponse response = noteService.create(guestToken, request);
		return ResponseEntity.status(CREATED).body(ApiResponse.success(response));
	}
}
