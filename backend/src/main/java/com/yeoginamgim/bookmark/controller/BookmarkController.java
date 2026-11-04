package com.yeoginamgim.bookmark.controller;

import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.bookmark.dto.BookmarkStateResponse;
import com.yeoginamgim.bookmark.dto.BookmarkedNotesResponse;
import com.yeoginamgim.bookmark.service.DatabaseBookmarkService;
import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.CurrentUserProvider;
import com.yeoginamgim.note.dto.NoteOpenRequest;
import com.yeoginamgim.note.dto.NotePageRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1")
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class BookmarkController {
	private final CurrentUserProvider currentUser;
	private final DatabaseBookmarkService bookmarks;

	public BookmarkController(CurrentUserProvider currentUser, DatabaseBookmarkService bookmarks) {
		this.currentUser = currentUser;
		this.bookmarks = bookmarks;
	}

	@PostMapping("/notes/{noteId}/bookmarks")
	public ResponseEntity<ApiResponse<BookmarkStateResponse>> save(@PathVariable UUID noteId,
		@Valid @RequestBody(required = false) NoteOpenRequest request) {
		var result = bookmarks.save(currentUser.requireUserId(), noteId, request == null ? null : request.location());
		return ResponseEntity.status(result.created() ? 201 : 200).cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(result.state()));
	}

	@DeleteMapping("/notes/{noteId}/bookmarks")
	public ResponseEntity<ApiResponse<BookmarkStateResponse>> remove(@PathVariable UUID noteId) {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(bookmarks.remove(currentUser.requireUserId(), noteId)));
	}

	@GetMapping("/users/me/bookmarks")
	public ResponseEntity<ApiResponse<BookmarkedNotesResponse>> findMine(@Valid @ModelAttribute NotePageRequest request) {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(bookmarks.findMine(currentUser.requireUserId(), request)));
	}
}
