package com.yeoginamgim.note.dto;

import java.util.UUID;

public record NoteDeleteResponse(UUID noteId, boolean deleted) {}
