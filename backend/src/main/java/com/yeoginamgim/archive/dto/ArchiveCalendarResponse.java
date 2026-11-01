package com.yeoginamgim.archive.dto;

import java.time.LocalDate;
import java.util.List;

public record ArchiveCalendarResponse(String month, List<Day> days) {
	public record Day(LocalDate date, long writtenCount, long savedCount) {}
}
