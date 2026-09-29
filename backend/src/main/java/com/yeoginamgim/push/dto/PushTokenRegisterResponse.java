package com.yeoginamgim.push.dto;

import java.time.Instant;
import java.util.UUID;

import com.yeoginamgim.push.domain.PushPlatform;

public record PushTokenRegisterResponse(UUID pushTokenId, PushPlatform platform, Instant createdAt) {
}
