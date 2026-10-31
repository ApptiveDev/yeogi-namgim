package com.yeoginamgim.note.access;

import java.time.Instant;

/** Optional measurement metadata stays unknown when clients only supply coordinates. */
public record LocationInput(double latitude, double longitude, Double accuracyMeters, Instant measuredAt) {}
