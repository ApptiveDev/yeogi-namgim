package com.yeoginamgim.bookmark.dto;

import java.time.Instant;
import java.util.UUID;

public record BookmarkStateResponse(UUID noteId, boolean isSaved, Instant savedAt) {}
