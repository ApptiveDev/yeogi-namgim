package com.yeoginamgim.archive.service;

import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

import com.yeoginamgim.archive.dto.ArchiveMapRequest;
import com.yeoginamgim.note.service.InvalidNoteRequestException;

/** Opaque keyset position bound to the viewer and selected map archive type. */
public final class ArchiveMapCursor {
	private static final String INVALID = "유효하지 않은 지도 보관함 커서입니다.";

	private ArchiveMapCursor() {}

	public static String encode(UUID userId, ArchiveMapRequest.Type type, Instant createdAt, UUID noteId) {
		String payload = String.join("|", "v1", userId.toString(), type.name(), createdAt.toString(), noteId.toString());
		return Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
	}

	public static Position decode(String token, UUID userId, ArchiveMapRequest.Type type) {
		if (token == null) return null;
		if (token.isBlank() || token.length() > 512) throw new InvalidNoteRequestException(INVALID);
		try {
			String[] fields = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8).split("\\|", -1);
			if (fields.length != 5 || !fields[0].equals("v1") || !fields[1].equals(userId.toString())
				|| !fields[2].equals(type.name())) throw new InvalidNoteRequestException(INVALID);
			return new Position(Instant.parse(fields[3]), UUID.fromString(fields[4]));
		} catch (DateTimeException | IllegalArgumentException exception) {
			throw new InvalidNoteRequestException(INVALID);
		}
	}

	public record Position(Instant createdAt, UUID noteId) {}
}
