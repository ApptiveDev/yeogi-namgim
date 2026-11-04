package com.yeoginamgim.note.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.CurrentUserProvider;
import com.yeoginamgim.note.discovery.DatabaseNoteDiscoveryService;
import com.yeoginamgim.note.dto.DiscoveredNotesResponse;
import com.yeoginamgim.note.dto.NoteDiscoveryPageRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/users/me/discovered-notes")
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class NoteDiscoveryController {
	private final CurrentUserProvider currentUser;
	private final DatabaseNoteDiscoveryService discoveries;

	public NoteDiscoveryController(CurrentUserProvider currentUser, DatabaseNoteDiscoveryService discoveries) {
		this.currentUser = currentUser;
		this.discoveries = discoveries;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<DiscoveredNotesResponse>> findMine(
		@Valid @ModelAttribute NoteDiscoveryPageRequest request) {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(discoveries.findMine(currentUser.requireUserId(), request)));
	}
}
