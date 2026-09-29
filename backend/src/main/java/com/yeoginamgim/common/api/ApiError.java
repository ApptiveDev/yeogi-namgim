package com.yeoginamgim.common.api;

public record ApiError(
	String code,
	String message
) {
}
