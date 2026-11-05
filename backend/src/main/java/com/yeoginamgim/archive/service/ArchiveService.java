package com.yeoginamgim.archive.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yeoginamgim.archive.dto.ArchiveCalendarResponse;
import com.yeoginamgim.archive.dto.ArchiveDisplayCard;
import com.yeoginamgim.archive.dto.ArchiveNotesRequest;
import com.yeoginamgim.archive.dto.ArchiveNotesResponse;
import com.yeoginamgim.archive.repository.ArchiveRepository;
import com.yeoginamgim.archive.service.NoteCardAssembler.Reference;
import com.yeoginamgim.user.domain.Member;
import com.yeoginamgim.user.repository.MemberRepository;

@Service
public class ArchiveService {
	private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
	private final ArchiveRepository archive;
	private final NoteCardAssembler cards;
	private final MemberRepository members;

	public ArchiveService(ArchiveRepository archive, NoteCardAssembler cards, MemberRepository members) {
		this.archive = archive;
		this.cards = cards;
		this.members = members;
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
		var position = ArchiveCursor.decode(request.cursor(), userId, request);
		var found = archive.find(userId, start, end, request, position);
		var page = found.stream().limit(request.size()).toList();
		var refs = page.stream()
			.map(item -> new Reference(item.noteId(), item.source(), item.savedAt(), null, null)).toList();
		boolean hasNext = found.size() > request.size();
		String nextCursor = hasNext ? ArchiveCursor.encode(userId, request,
			page.getLast().createdAt(), page.getLast().noteId()) : null;
		var assembled = cards.assemble(userId, refs, null);
		Map<UUID, UUID> authorByNote = page.stream().collect(Collectors.toMap(
			item -> item.noteId(), item -> item.authorUserId()));
		Set<UUID> namedAuthors = assembled.stream()
			.filter(card -> !card.authorCategory().equals("ANONYMOUS"))
			.map(card -> authorByNote.get(card.noteId())).collect(Collectors.toSet());
		Map<UUID, String> names = members.findAllById(namedAuthors).stream().collect(Collectors.toMap(
			Member::getId, Member::getNickname));
		var displayCards = assembled.stream().map(card -> ArchiveDisplayCard.from(card,
			card.authorCategory().equals("ANONYMOUS") ? "익명"
				: names.getOrDefault(authorByNote.get(card.noteId()), "익명"))).toList();
		return new ArchiveNotesResponse(date, displayCards, request.size(),
			hasNext, nextCursor);
	}
}
