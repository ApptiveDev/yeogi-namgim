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
import com.yeoginamgim.note.dto.MyNotesResponse;
import com.yeoginamgim.note.dto.NotePageRequest;
import com.yeoginamgim.note.service.NoteService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/users/me/notes")
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class MemberNoteController {
	private final CurrentUserProvider currentUser;
	private final NoteService notes;

	public MemberNoteController(CurrentUserProvider currentUser, NoteService notes) {
		this.currentUser = currentUser;
		this.notes = notes;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<MyNotesResponse>> findMine(@Valid @ModelAttribute NotePageRequest request) {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(notes.findMine(currentUser.requireUserId(), request)));
	}
}
