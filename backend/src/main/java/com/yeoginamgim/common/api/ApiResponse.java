package com.yeoginamgim.common.api;

public record ApiResponse<T>(
	boolean success,
	T data,
	ApiMeta meta
) {
	public static <T> ApiResponse<T> success(T data) {
		return new ApiResponse<>(true, data, ApiMeta.create());
	}
}
