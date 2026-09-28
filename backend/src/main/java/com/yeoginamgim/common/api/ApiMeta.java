package com.yeoginamgim.common.api;

import java.time.Instant;

public record ApiMeta(
	String requestId,
	Instant timestamp
) {
}

