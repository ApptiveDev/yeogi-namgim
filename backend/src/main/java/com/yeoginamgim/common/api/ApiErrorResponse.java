package com.yeoginamgim.common.api;

public record ApiErrorResponse(
	boolean success,
	ApiError error,
	ApiMeta meta
) {
	public static ApiErrorResponse of(String code, String message) {
		return new ApiErrorResponse(false, new ApiError(code, message), ApiMeta.create());
	}
}
