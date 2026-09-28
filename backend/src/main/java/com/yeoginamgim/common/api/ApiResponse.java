package com.yeoginamgim.common.api;

import java.time.Instant;
import java.util.UUID;

public record ApiResponse<T>(
	boolean success,
	T data,
	ApiMeta meta
) {
	public static <T> ApiResponse<T> success(T data) {
		String requestId = "req_" + UUID.randomUUID().toString().replace("-", "");
		return new ApiResponse<>(true, data, new ApiMeta(requestId, Instant.now()));
	}
}

