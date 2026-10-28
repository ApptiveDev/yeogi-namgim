package com.yeoginamgim.note.access;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface NoteAccessService {
	Map<UUID, NoteAccessResult> evaluate(UUID userId, LocationInput location, List<NoteAccessTarget> targets);
}
