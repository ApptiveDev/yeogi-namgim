package com.yeoginamgim.common.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.yeoginamgim.guest.service.InvalidGuestTokenException;
import com.yeoginamgim.common.rate.RateLimitExceededException;
import com.yeoginamgim.push.service.PushTokenConflictException;
import com.yeoginamgim.push.service.PushTokenNotFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {
	@ExceptionHandler(RateLimitExceededException.class)
	public ResponseEntity<ApiErrorResponse> handleRateLimit() {
		return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
			.body(ApiErrorResponse.of("TOO_MANY_REQUESTS", "요청 횟수 제한을 초과했습니다."));
	}
	@ExceptionHandler(PushTokenConflictException.class)
	public ResponseEntity<ApiErrorResponse> handlePushTokenConflict() {
		return ResponseEntity.status(HttpStatus.CONFLICT)
			.body(ApiErrorResponse.of("CONFLICT", "기기 토큰이 다른 사용자에게 등록되어 있습니다."));
	}

	@ExceptionHandler(PushTokenNotFoundException.class)
	public ResponseEntity<ApiErrorResponse> handlePushTokenNotFound() {
		return ResponseEntity.status(HttpStatus.NOT_FOUND)
			.body(ApiErrorResponse.of("RESOURCE_NOT_FOUND", "기기 토큰을 찾을 수 없습니다."));
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
