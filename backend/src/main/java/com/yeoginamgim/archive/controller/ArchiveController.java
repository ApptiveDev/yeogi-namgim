package com.yeoginamgim.archive.controller;

import java.time.YearMonth;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.yeoginamgim.archive.dto.ArchiveCalendarResponse;
import com.yeoginamgim.archive.dto.ArchiveNotesRequest;
import com.yeoginamgim.archive.dto.ArchiveNotesResponse;
import com.yeoginamgim.archive.service.ArchiveService;
import com.yeoginamgim.common.api.ApiResponse;
import com.yeoginamgim.common.auth.CurrentUserProvider;
import com.yeoginamgim.note.service.InvalidNoteRequestException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api/v1/users/me/archive")
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class ArchiveController {
	private final CurrentUserProvider currentUser;
	private final ArchiveService archive;

	public ArchiveController(CurrentUserProvider currentUser, ArchiveService archive) {
		this.currentUser = currentUser;
		this.archive = archive;
	}

	@GetMapping("/calendar")
	public ResponseEntity<ApiResponse<ArchiveCalendarResponse>> calendar(
		@RequestParam @Pattern(regexp = "[0-9]{4}-(0[1-9]|1[0-2])") String month) {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(archive.calendar(currentUser.requireUserId(), YearMonth.parse(month))));
	}

	@GetMapping("/notes")
	public ResponseEntity<ApiResponse<ArchiveNotesResponse>> notes(@Valid @ModelAttribute ArchiveNotesRequest request,
		@RequestParam(required = false) String page) {
		if (page != null) throw new InvalidNoteRequestException("보관함 목록은 page 대신 cursor를 사용합니다.");
		return ResponseEntity.ok().cacheControl(CacheControl.noStore())
			.body(ApiResponse.success(archive.find(currentUser.requireUserId(), request)));
	}
}
