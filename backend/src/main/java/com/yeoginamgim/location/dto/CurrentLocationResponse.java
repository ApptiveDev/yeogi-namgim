package com.yeoginamgim.location.dto;

import java.time.Instant;

public record CurrentLocationResponse(double latitude, double longitude, Instant updatedAt) {
}
