package com.yeoginamgim.bookmark.dto;

import java.util.List;
import com.yeoginamgim.archive.dto.ArchiveNoteCard;

public record BookmarkedNotesResponse(List<ArchiveNoteCard> notes, int page, int size, boolean hasNext) {}
