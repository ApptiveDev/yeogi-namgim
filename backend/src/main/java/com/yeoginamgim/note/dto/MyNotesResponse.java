package com.yeoginamgim.note.dto;

import java.util.List;

public record MyNotesResponse(List<MyNoteResponse> notes, int page, int size, boolean hasNext) {}
