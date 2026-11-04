package com.yeoginamgim.user.dto;

/** A null savedNoteCount means that the bookmark source is not connected. */
public record MemberStatsResponse(long writtenNoteCount, long friendCount, Long savedNoteCount) { }
