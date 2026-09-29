package com.yeoginamgim.common.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.yeoginamgim.guest.service.InvalidGuestTokenException;

@RestControllerAdvice
public class GlobalExceptionHandler {
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
