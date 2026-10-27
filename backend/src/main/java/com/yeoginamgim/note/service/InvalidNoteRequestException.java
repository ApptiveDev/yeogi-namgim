package com.yeoginamgim.note.service;

public class InvalidNoteRequestException extends RuntimeException {
	public InvalidNoteRequestException(String message) {
		super(message);
	}
}
