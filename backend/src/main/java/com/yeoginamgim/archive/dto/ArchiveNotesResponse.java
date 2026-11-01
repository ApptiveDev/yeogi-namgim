package com.yeoginamgim.archive.dto;

import java.time.LocalDate;
import java.util.List;

public record ArchiveNotesResponse(LocalDate date, List<ArchiveNoteCard> notes,
	int page, int size, boolean hasNext) {}
