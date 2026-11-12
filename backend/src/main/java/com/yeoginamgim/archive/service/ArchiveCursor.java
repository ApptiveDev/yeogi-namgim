package com.yeoginamgim.archive.service;

import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Base64;
import java.util.UUID;

import com.yeoginamgim.archive.dto.ArchiveNotesRequest;
import com.yeoginamgim.note.service.InvalidNoteRequestException;

/** Opaque position bound to a member, date, and filter selection. */
public final class ArchiveCursor {
	private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
	private static final String INVALID = "유효하지 않은 보관함 커서입니다.";

	private ArchiveCursor() {}

	public static String encode(UUID userId, ArchiveNotesRequest request, Instant createdAt, UUID noteId) {
		String payload = String.join("|", "v1", userId.toString(), request.date().toString(),
			request.type().name(), value(request.writtenVisibility()), value(request.savedCategory()),
			createdAt.toString(), noteId.toString());
		return Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
	}

	public static Position decode(String token, UUID userId, ArchiveNotesRequest request) {
		if (token == null) return null;
		if (token.isBlank() || token.length() > 512) throw new InvalidNoteRequestException(INVALID);
		try {
			String payload = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
			String[] fields = payload.split("\\|", -1);
			if (fields.length != 8 || !fields[0].equals("v1") || !fields[1].equals(userId.toString())
				|| !fields[2].equals(request.date().toString()) || !fields[3].equals(request.type().name())
				|| !fields[4].equals(value(request.writtenVisibility()))
				|| !fields[5].equals(value(request.savedCategory()))) {
				throw new InvalidNoteRequestException(INVALID);
			}
			Instant createdAt = Instant.parse(fields[6]);
			if (!createdAt.atZone(SEOUL).toLocalDate().equals(request.date())) {
				throw new InvalidNoteRequestException(INVALID);
			}
			return new Position(createdAt, UUID.fromString(fields[7]));
		} catch (DateTimeException | IllegalArgumentException exception) {
			throw new InvalidNoteRequestException(INVALID);
		}
	}

	private static String value(Enum<?> filter) { return filter == null ? "-" : filter.name(); }

	public record Position(Instant createdAt, UUID noteId) {}
}
