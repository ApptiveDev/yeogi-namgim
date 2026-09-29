package com.yeoginamgim.push.repository;

import java.util.UUID;

import com.yeoginamgim.push.domain.PushPlatform;

public record PushCandidate(UUID tokenId, PushPlatform platform, String deviceToken, String regionKey) {
}
