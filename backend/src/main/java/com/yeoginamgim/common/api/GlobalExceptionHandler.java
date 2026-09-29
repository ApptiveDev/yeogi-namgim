package com.yeoginamgim.common.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.yeoginamgim.guest.service.InvalidGuestTokenException;
import com.yeoginamgim.common.rate.RateLimitExceededException;
import com.yeoginamgim.note.service.NoteLockedException;
import com.yeoginamgim.note.service.NoteNotFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
	@ExceptionHandler(RateLimitExceededException.class)
	public ResponseEntity<ApiErrorResponse> handleRateLimit() {
		return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
			.body(ApiErrorResponse.of("TOO_MANY_REQUESTS", "요청 횟수 제한을 초과했습니다."));
	}

	@ExceptionHandler(NoteLockedException.class)
	public ResponseEntity<ApiErrorResponse> handleNoteLocked() {
		return ResponseEntity.status(HttpStatus.FORBIDDEN)
			.body(ApiErrorResponse.of("NOTE_LOCKED", "쪽지를 열람할 수 있는 거리 밖에 있습니다."));
	}

	@ExceptionHandler(NoteNotFoundException.class)
	public ResponseEntity<ApiErrorResponse> handleNoteNotFound() {
		return ResponseEntity.status(HttpStatus.NOT_FOUND)
			.body(ApiErrorResponse.of("RESOURCE_NOT_FOUND", "쪽지를 찾을 수 없습니다."));
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ApiErrorResponse> handleTypeMismatch() {
		return ResponseEntity.badRequest()
			.body(ApiErrorResponse.of("INVALID_REQUEST", "Request parameter is invalid"));
	}

	@ExceptionHandler(InvalidGuestTokenException.class)
	public ResponseEntity<ApiErrorResponse> handleInvalidGuestToken() {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
			.body(ApiErrorResponse.of("UNAUTHORIZED", "Guest token is missing or invalid"));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
		String message = exception.getBindingResult().getFieldErrors().stream()
			.findFirst()
			.map(error -> error.getField() + ": " + error.getDefaultMessage())
			.orElse("Request validation failed");
		return ResponseEntity.badRequest()
			.body(ApiErrorResponse.of("INVALID_REQUEST", message));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ApiErrorResponse> handleUnreadableMessage() {
		return ResponseEntity.badRequest()
			.body(ApiErrorResponse.of("INVALID_REQUEST", "Request body is missing or malformed"));
	}
}
