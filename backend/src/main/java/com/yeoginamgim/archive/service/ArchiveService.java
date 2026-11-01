package com.yeoginamgim.archive.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.archive.dto.ArchiveCalendarResponse;
import com.yeoginamgim.archive.dto.ArchiveNotesRequest;
import com.yeoginamgim.archive.dto.ArchiveNotesResponse;
import com.yeoginamgim.archive.repository.ArchiveRepository;
import com.yeoginamgim.archive.service.NoteCardAssembler.Reference;

@Service
public class ArchiveService {
	private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
	private final ArchiveRepository archive;
	private final NoteCardAssembler cards;

	public ArchiveService(ArchiveRepository archive, NoteCardAssembler cards) {
		this.archive = archive;
		this.cards = cards;
	}

	@Transactional(readOnly = true)
	public ArchiveCalendarResponse calendar(UUID userId, YearMonth month) {
		var start = month.atDay(1).atStartOfDay(SEOUL).toInstant();
		var end = month.plusMonths(1).atDay(1).atStartOfDay(SEOUL).toInstant();
		return new ArchiveCalendarResponse(month.toString(), archive.calendar(userId, start, end));
	}

	@Transactional(readOnly = true)
	public ArchiveNotesResponse find(UUID userId, ArchiveNotesRequest request) {
		LocalDate date = request.date();
		var start = date.atStartOfDay(SEOUL).toInstant();
		var end = date.plusDays(1).atStartOfDay(SEOUL).toInstant();
		var found = archive.find(userId, start, end, request);
		var refs = found.stream().limit(request.size())
			.map(item -> new Reference(item.noteId(), item.source(), item.savedAt(), null, null)).toList();
		return new ArchiveNotesResponse(date, cards.assemble(userId, refs, null), request.page(), request.size(),
			found.size() > request.size());
	}
}
