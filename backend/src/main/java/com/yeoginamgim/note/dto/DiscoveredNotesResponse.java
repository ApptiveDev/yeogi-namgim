package com.yeoginamgim.note.dto;

import java.util.List;
import com.yeoginamgim.archive.dto.ArchiveNoteCard;

public record DiscoveredNotesResponse(List<ArchiveNoteCard> notes, int page, int size, boolean hasNext) {}
