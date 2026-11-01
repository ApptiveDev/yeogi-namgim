package com.yeoginamgim.archive.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ArchiveNotesRequest(@NotNull LocalDate date, ArchiveType type,
	WrittenVisibility writtenVisibility, SavedCategory savedCategory,
	@Min(0) @Max(10000) Integer page, @Min(1) @Max(100) Integer size) {
	public ArchiveNotesRequest {
		if (type == null) type = ArchiveType.ALL;
		if (page == null) page = 0;
		if (size == null) size = 20;
	}

	@AssertTrue(message = "subfilters must match the selected archive type")
	public boolean isFilterCombinationValid() {
		return switch (type) {
			case ALL -> writtenVisibility == null && savedCategory == null;
			case WRITTEN -> savedCategory == null;
			case SAVED -> writtenVisibility == null;
		};
	}

	public enum ArchiveType { ALL, WRITTEN, SAVED }
	public enum WrittenVisibility { ALL, PUBLIC, FRIENDS, PRIVATE }
	public enum SavedCategory { ALL, FRIEND, ANONYMOUS }
}
