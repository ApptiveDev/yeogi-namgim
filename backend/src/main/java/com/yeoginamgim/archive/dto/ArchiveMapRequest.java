package com.yeoginamgim.archive.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ArchiveMapRequest(@NotNull Type type, @Size(max = 512) String cursor,
	@Min(1) @Max(500) Integer size) {
	public ArchiveMapRequest {
		if (size == null) size = 100;
	}

	public enum Type { WRITTEN, SAVED }
}
