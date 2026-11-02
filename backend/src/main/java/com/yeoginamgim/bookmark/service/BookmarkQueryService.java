package com.yeoginamgim.bookmark.service;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Implemented by the bookmark owner against real persisted bookmark state. */
public interface BookmarkQueryService {
	Map<UUID, Instant> findSavedAt(UUID userId, Set<UUID> noteIds);
	long countSavedNotes(UUID userId);
}
