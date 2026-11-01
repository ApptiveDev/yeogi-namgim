package com.yeoginamgim.note.discovery;

import java.util.Set;
import java.util.UUID;

/** Read-only; maps never create discovery/read records. */
public interface NoteDiscoveryQueryService {
	Set<UUID> findReadNoteIds(UUID userId, Set<UUID> noteIds);
}
