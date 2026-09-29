package com.yeoginamgim.common.api;

import java.time.Instant;
import java.util.UUID;

public record ApiMeta(
	String requestId,
	Instant timestamp
) {
	public static ApiMeta create() {
		String requestId = "req_" + UUID.randomUUID().toString().replace("-", "");
		return new ApiMeta(requestId, Instant.now());
	}
}
