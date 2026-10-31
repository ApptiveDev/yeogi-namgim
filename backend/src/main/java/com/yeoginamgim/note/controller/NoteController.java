package com.yeoginamgim.note.controller;

import static org.springframework.http.HttpStatus.CREATED;

import java.util.UUID;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.BearerTokenExtractor;
import com.yeoginamgim.note.dto.NoteCreateRequest;
import com.yeoginamgim.note.dto.NoteCreateResponse;
import com.yeoginamgim.note.dto.NoteMapBoundsRequest;
import com.yeoginamgim.note.dto.NoteOpenRequest;
import com.yeoginamgim.note.dto.NoteOpenResponse;
import com.yeoginamgim.note.service.NoteService;
import com.yeoginamgim.note.service.NoteOpenService;
import com.yeoginamgim.note.service.NoteMapService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/notes")
public class NoteController {
	private final NoteService noteService;
	private final NoteOpenService noteOpenService;
	private final NoteMapService noteMapService;
	private final BearerTokenExtractor bearerTokenExtractor;

	public NoteController(NoteService noteService, NoteOpenService noteOpenService, NoteMapService noteMapService,
		BearerTokenExtractor bearerTokenExtractor) {
		this.noteService = noteService;
		this.noteOpenService = noteOpenService;
		this.noteMapService = noteMapService;
		this.bearerTokenExtractor = bearerTokenExtractor;
	}

	@PostMapping
	public ResponseEntity<ApiResponse<NoteCreateResponse>> create(
		@RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
		@Valid @RequestBody NoteCreateRequest request
	) {
		String token = bearerTokenExtractor.extract(authorizationHeader);
		NoteCreateResponse response = noteService.create(token, request);
		return ResponseEntity.status(CREATED).cacheControl(CacheControl.noStore()).body(ApiResponse.success(response));
	}

	@GetMapping
	public ResponseEntity<ApiResponse<Object>> findMarkers(
		@RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
		@Valid @ModelAttribute NoteMapBoundsRequest bounds
	) {
		String token = bearerTokenExtractor.extract(authorizationHeader);
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(noteMapService.find(token, bounds)));
	}

	@PostMapping("/{noteId}/open")
	public ResponseEntity<ApiResponse<NoteOpenResponse>> open(
		@RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
		@PathVariable UUID noteId,
		@Valid @RequestBody(required = false) NoteOpenRequest request
	) {
		String token = bearerTokenExtractor.extract(authorizationHeader);
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(noteOpenService.open(token, noteId, request)));
	}
}
