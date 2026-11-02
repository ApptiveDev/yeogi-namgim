package com.yeoginamgim.archive.dto;

import java.time.LocalDate;
import java.util.List;

public record ArchiveNotesResponse(LocalDate date, List<ArchiveDisplayCard> notes,
	int size, boolean hasNext, String nextCursor) {}
